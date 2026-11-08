"use client";

import { LIMITS } from "@/lib/limits";
import type { Profile } from "@/lib/types";
import { Field } from "./ui";

export function Foundation({
  profile,
  onChange,
  onSave,
  onLoadSample,
}: {
  profile: Profile;
  onChange: (profile: Profile) => void;
  onSave: () => void;
  onLoadSample: () => void;
}) {
  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    onChange({ ...profile, [key]: value });
  }

  return (
    <section className="panel">
      <h2>Tell us about the business</h2>
      <p className="hint">
        Fill this in with real notes. The later steps are only allowed to use
        what you write here. If you skip a story, the app will skip it too — it
        will not invent one.
      </p>
      <div className="grid two" style={{ marginTop: 16 }}>
        <Field
          label="Business"
          hint="What the company is, in plain language."
          value={profile.business}
          onChange={(value) => set("business", value)}
        />
        <Field
          label="Offer"
          hint="What you sell, and who it is for."
          value={profile.offer}
          onChange={(value) => set("offer", value)}
        />
        <Field
          label="Startup stage"
          value={profile.startupStage}
          onChange={(value) => set("startupStage", value)}
          rows={3}
        />
        <Field
          label="Target buyer"
          value={profile.targetBuyer}
          onChange={(value) => set("targetBuyer", value)}
        />
        <Field
          label="Buyer pain points"
          value={profile.buyerPainPoints}
          onChange={(value) => set("buyerPainPoints", value)}
        />
        <Field
          label="Differentiation"
          hint="What is different, without slogans."
          value={profile.differentiation}
          onChange={(value) => set("differentiation", value)}
        />
        <Field
          label="Founder background"
          hint="Only facts you are willing to see in public."
          value={profile.founderBackground}
          onChange={(value) => set("founderBackground", value)}
        />
        <Field
          label="Genuine experiences"
          hint="Stories you have actually lived. If it is not here, it will not be written."
          value={profile.genuineExperiences}
          onChange={(value) => set("genuineExperiences", value)}
        />
        <Field
          label="Writing samples"
          hint="Paste a few lines that sound like you."
          value={profile.writingSamples}
          onChange={(value) => set("writingSamples", value)}
          maxLength={LIMITS.long}
          rows={6}
        />
        <Field
          label="Preferred tone"
          value={profile.preferredTone}
          onChange={(value) => set("preferredTone", value)}
          rows={3}
        />
        <Field
          label="Business restrictions"
          hint="DTW default: do not mention IIMCIP in marketing content. You can edit this."
          value={profile.restrictions}
          onChange={(value) => set("restrictions", value)}
        />
        <Field
          label="Pasted source material (optional)"
          hint="This app cannot search the web. If you paste notes, they are treated as your notes, not verified facts."
          value={profile.pastedSourceMaterial}
          onChange={(value) => set("pastedSourceMaterial", value)}
          maxLength={LIMITS.long}
        />
      </div>
      <div className="actions">
        <button type="button" className="primary" onClick={onSave}>
          Save and continue
        </button>
        <button type="button" className="ghost" onClick={onLoadSample}>
          Load labelled sample answers
        </button>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        Sample answers are marked [SAMPLE] so you can try the app. They are not
        real DTW claims. Real work should replace them.
      </p>
    </section>
  );
}
