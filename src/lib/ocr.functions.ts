// Lovable AI Gateway - OCR/extraction server function
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  // base64-encoded image data URL ("data:image/png;base64,....") or PDF base64 data URL
  fileDataUrl: z.string().min(1).max(50_000_000),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sourceFileUrl: z.string().optional(),
});

const ExtractionSchema = z.object({
  carrier: z.object({
    name: z.string().default(""),
    mc_number: z.string().default(""),
    address: z.string().default(""),
    phone: z.string().default(""),
  }),
  loads: z.array(
    z.object({
      load_number: z.string().default(""),
      broker: z.string().default(""),
      pickup_date: z.string().default(""),
      pickup_city: z.string().default(""),
      pickup_state: z.string().default(""),
      delivery_city: z.string().default(""),
      delivery_state: z.string().default(""),
      rate: z.number().default(0),
    })
  ).default([]),
});

const TOOL = {
  type: "function" as const,
  function: {
    name: "submit_extraction",
    description: "Submit the extracted rate confirmation data.",
    parameters: {
      type: "object",
      properties: {
        carrier: {
          type: "object",
          properties: {
            name: { type: "string", description: "Carrier company name billed for the load" },
            mc_number: { type: "string", description: "Motor Carrier (MC) number, digits only" },
            address: { type: "string", description: "Carrier address" },
            phone: { type: "string", description: "Carrier phone number" },
          },
          required: ["name", "mc_number", "address", "phone"],
          additionalProperties: false,
        },
        loads: {
          type: "array",
          description: "All loads found on the rate confirmation. Usually 1 load per rate-con but some have multiple.",
          items: {
            type: "object",
            properties: {
              load_number: { type: "string", description: "Load/Order/PRO/Confirmation number" },
              broker: { type: "string", description: "Broker / shipper company name issuing the rate confirmation" },
              pickup_date: { type: "string", description: "Pickup date in YYYY-MM-DD format" },
              pickup_city: { type: "string" },
              pickup_state: { type: "string", description: "2-letter US state abbreviation" },
              delivery_city: { type: "string" },
              delivery_state: { type: "string", description: "2-letter US state abbreviation" },
              rate: { type: "number", description: "Total rate amount in USD (number only, no $)" },
            },
            required: ["load_number", "broker", "pickup_date", "pickup_city", "pickup_state", "delivery_city", "delivery_state", "rate"],
            additionalProperties: false,
          },
        },
      },
      required: ["carrier", "loads"],
      additionalProperties: false,
    },
  },
};

export const extractRateConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const isImage = data.mimeType.startsWith("image/");
    if (!isImage) {
      throw new Error("Only image data is accepted by the extractor. Convert PDF pages to images on the client first.");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You extract structured data from trucking rate confirmation documents. Read the document carefully and call submit_extraction with the carrier (bill-to) and every load. Use empty string for unknown text fields and 0 for unknown numbers. Dates must be YYYY-MM-DD. States must be 2-letter abbreviations.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract carrier and loads from this rate confirmation: ${data.fileName}` },
              { type: "image_url", image_url: { url: data.fileDataUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_extraction" } },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit exceeded. Please try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error:", res.status, t);
      throw new Error(`AI extraction failed (${res.status})`);
    }

    const payload = await res.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI returned no extraction");

    let parsedArgs: unknown;
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("AI returned malformed extraction JSON");
    }
    const extraction = ExtractionSchema.parse(parsedArgs);

    const { supabase, userId } = context;

    // Find or create carrier (dedupe by mc_number when present, else by name)
    let carrierId: string | null = null;
    const carrierName = extraction.carrier.name?.trim();
    const carrierMc = extraction.carrier.mc_number?.replace(/\D/g, "");
    if (carrierName || carrierMc) {
      let existing: { id: string } | null = null;
      if (carrierMc) {
        const { data: byMc } = await supabase
          .from("carriers")
          .select("id")
          .eq("user_id", userId)
          .eq("mc_number", carrierMc)
          .maybeSingle();
        existing = byMc ?? null;
      }
      if (!existing && carrierName) {
        const { data: byName } = await supabase
          .from("carriers")
          .select("id")
          .eq("user_id", userId)
          .eq("name", carrierName)
          .maybeSingle();
        existing = byName ?? null;
      }
      if (existing) {
        carrierId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from("carriers")
          .insert({
            user_id: userId,
            name: carrierName || "Unknown carrier",
            mc_number: carrierMc || "",
            address: extraction.carrier.address || "",
            phone: extraction.carrier.phone || "",
          })
          .select("id")
          .maybeSingle();
        if (error) throw new Error(`Carrier insert failed: ${error.message}`);
        if (!created) throw new Error("Carrier creation returned no ID");
        carrierId = created.id;
      }
    }

    // Insert loads
    const loadRows = extraction.loads.map((l) => ({
      user_id: userId,
      carrier_id: carrierId,
      load_number: l.load_number || "",
      broker: l.broker || "",
      pickup_date: l.pickup_date && /^\d{4}-\d{2}-\d{2}$/.test(l.pickup_date) ? l.pickup_date : null,
      pickup_city: l.pickup_city || "",
      pickup_state: (l.pickup_state || "").toUpperCase().slice(0, 2),
      delivery_city: l.delivery_city || "",
      delivery_state: (l.delivery_state || "").toUpperCase().slice(0, 2),
      rate: Number(l.rate) || 0,
      source_file_url: data.sourceFileUrl ?? null,
      raw_extraction: extraction as never,
    }));

    let insertedLoadIds: string[] = [];
    if (loadRows.length > 0) {
      const { data: inserted, error } = await supabase
        .from("loads")
        .insert(loadRows)
        .select("id");
      if (error) throw new Error(`Load insert failed: ${error.message}`);
      insertedLoadIds = (inserted ?? []).map((r) => r.id);
    }

    return {
      carrierId,
      loadIds: insertedLoadIds,
      extraction,
    };
  });
