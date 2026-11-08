import type { Profile } from "./types";

export const EMPTY_PROFILE: Profile = {
  business: "",
  offer: "",
  startupStage: "",
  targetBuyer: "",
  buyerPainPoints: "",
  differentiation: "",
  founderBackground: "",
  genuineExperiences: "",
  writingSamples: "",
  preferredTone: "",
  restrictions: "Do not mention IIMCIP in marketing content.",
  pastedSourceMaterial: "",
};

export const SAMPLE_PROFILE: Profile = {
  business:
    "[SAMPLE] DTW is a founder-led B2B practice that helps operators explain a complex offer in plain language.",
  offer:
    "[SAMPLE] A working session and follow-through that turns a messy offer into a clear story a buyer can repeat.",
  startupStage: "[SAMPLE] Early, still proving the offer with a small set of buyers.",
  targetBuyer:
    "[SAMPLE] A technical founder or operator who sells to other businesses and feels the message falling apart in sales calls.",
  buyerPainPoints:
    "[SAMPLE] Buyers hear features, not the job they need done. The founder repeats origin stories that do not help the buyer decide.",
  differentiation:
    "[SAMPLE] We start from the buyer's problem, not from the founder's biography. We only use experiences the founder has actually written down.",
  founderBackground:
    "[SAMPLE] The founder has sat in sales calls where a strong product still lost because the story was vague. No other biography is supplied.",
  genuineExperiences:
    "[SAMPLE] One pattern the founder has seen: a buyer nods through a demo, then asks 'so what do you actually do?' Nothing else is claimed.",
  writingSamples:
    "[SAMPLE] Short sentences. Names the buyer first. No slogans. Sounds like a person who has been in the room, not a brochure.",
  preferredTone: "Plain, direct, calm. No hype.",
  restrictions: "Do not mention IIMCIP in marketing content.",
  pastedSourceMaterial: "",
};
