/* prisma/seed.mjs
 * Robust content seeder for Prisma (v4/v5).
 * Usage:
 *   npx prisma db push
 *   npm run seed
 *   RESET=true npm run seed   # optional wipe
 */

import 'dotenv/config';
import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg;   // <-- use Prisma.dmmf (not prisma._dmmf)
const prisma = new PrismaClient();

/* ---------- Demo data ---------- */
const demo = {
    resources: [
        "Study Guide: UX Basics","Mentor Directory","Figma Shortcuts","Open Data Pack","Project Brief Template",
        "Interview Q&A","Pitch Deck Slides","Scholarship List","Hackathon Kit","Career Roadmap","Reading List","Starter Repo",
    ].map((t, i) => row(t, "Curated resource to help you get started faster.", null,
        ["Guides","Mentors","Cheat-sheet","Data","Templates","Q&A","Slides","Scholarship","Event","Career","Books","Code"][i % 12])),
    opportunities: [
        "Campus UX Challenge","AI for Good","Summer Internship","Volunteer Drive","Design Sprint","Startup Weekend",
        "Research Assistant","Mentor Shadowing","Community Project","Open Call: Speakers","Workshop Host","Photography Crew",
    ].map((t, i) => row(t, "Join and grow with hands-on experience.", null,
        ["Challenge","Impact","Intern","Volunteer","Sprint","Startup","Research","Mentor","Project","Talks","Host","Media"][i % 12])),
    courses: [
        "Intro to UX","Prototyping Essentials","Design Systems 101","Web Accessibility","Portfolio Studio","Frontend for Designers",
        "Interview Prep","Usability Testing","Figma Advanced","Visual Design Basics","Responsive Web","Content Strategy",
    ].map((t) => row(t, "Self-paced modules with certificates on completion.", null, "Course")),
};

function row(title, summary, image = null, tag = undefined) {
    return { title, summary, image, tag, slug: slugify(title) };
}
function slugify(s) {
    return String(s).toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/* ---------- Model + field detection ---------- */
const nameCandidates = {
    course: ["Course", "Courses"],
    resource: ["Resource", "Resources", "Material", "Materials"],
    opportunity: ["Opportunity", "Opportunities"],
};
const fieldCandidates = {
    title: ["title", "name"],
    summary: ["summary", "description", "details", "body"],
    image: ["image", "cover", "thumbnail", "banner"],
    tag: ["tag", "category", "type", "label"],
    slug: ["slug", "handle", "code"],
};

async function main() {
    // ✅ Correct way to access runtime model metadata
    const dmmf = Prisma?.dmmf;
    if (!dmmf) {
        throw new Error("Prisma.dmmf is unavailable. Make sure you're on @prisma/client v4+ and using Node (not edge).");
    }
    const models = dmmf.datamodel.models;

    const found = {
        course: findModel(models, nameCandidates.course),
        resource: findModel(models, nameCandidates.resource),
        opportunity: findModel(models, nameCandidates.opportunity),
    };

    console.log("Detected models:", {
        course: found.course?.name ?? null,
        resource: found.resource?.name ?? null,
        opportunity: found.opportunity?.name ?? null,
    });

    if (found.course) await seedCategory(found.course, demo.courses, "courses");
    if (found.resource) await seedCategory(found.resource, demo.resources, "resources");
    if (found.opportunity) await seedCategory(found.opportunity, demo.opportunities, "opportunities");

    console.log("✅ Seeding finished.");
}

function findModel(models, candidates) {
    const map = new Map(models.map((m) => [m.name.toLowerCase(), m]));
    for (const c of candidates) {
        const m = map.get(c.toLowerCase());
        if (m) return m;
    }
    // fuzzy singular/plural
    for (const m of models) {
        const n = m.name.toLowerCase();
        if (candidates.some((c) => n.includes(c.toLowerCase().replace(/s$/, '')))) return m;
    }
    return null;
}

function pickField(model, candidates) {
    const fields = new Map(model.fields.map((f) => [f.name.toLowerCase(), f]));
    for (const c of candidates) {
        const f = fields.get(c.toLowerCase());
        if (f) return f;
    }
    return null;
}

function buildRecords(model, rows) {
    const fTitle = pickField(model, fieldCandidates.title);
    const fSummary = pickField(model, fieldCandidates.summary);
    const fImage = pickField(model, fieldCandidates.image);
    const fTag = pickField(model, fieldCandidates.tag);
    const fSlug = pickField(model, fieldCandidates.slug);

    const allowed = new Set([fTitle?.name, fSummary?.name, fImage?.name, fTag?.name, fSlug?.name].filter(Boolean));

    const blockers = model.fields.filter((f) =>
        f.kind === "scalar" &&
        f.isRequired &&
        !f.isId &&
        !f.hasDefaultValue &&
        !f.isUpdatedAt &&
        !allowed.has(f.name)
    );

    if (blockers.length) {
        return { canSeed: false, reason: `Required fields not handled: ${blockers.map(b => b.name).join(", ")}` };
    }

    const data = rows.map((r) => {
        const obj = {};
        if (fTitle) obj[fTitle.name] = r.title;
        if (fSummary) obj[fSummary.name] = r.summary ?? null;
        if (fImage) obj[fImage.name] = r.image ?? null;
        if (fTag) obj[fTag.name] = r.tag ?? null;
        if (fSlug) obj[fSlug.name] = r.slug;
        return obj;
    });

    return { canSeed: true, data };
}

async function seedCategory(model, rows, label) {
    const delegate = getDelegateName(model.name);
    if (!prisma[delegate]) {
        console.warn(`⚠️ Skipping ${model.name} (${label}) → prisma.${delegate} not found on client.`);
        return;
    }

    const { canSeed, data, reason } = buildRecords(model, rows);
    if (!canSeed) {
        console.warn(`⚠️ Skipping ${model.name} (${label}) → ${reason}`);
        return;
    }

    const RESET = process.env.RESET === "true";
    try {
        if (RESET) {
            console.log(`↺ Clearing existing ${model.name}…`);
            await prisma[delegate].deleteMany({});
        }
    } catch (err) {
        console.warn(`(non-fatal) deleteMany failed for ${model.name}:`, shortErr(err));
    }

    try {
        console.log(`→ Seeding ${model.name} (${data.length} rows)…`);
        await prisma[delegate].createMany({ data, skipDuplicates: true });
    } catch (err) {
        console.warn(`createMany failed for ${model.name} — falling back to upserts…`, shortErr(err));
        for (const row of data) {
            try {
                const slugKey = Object.keys(row).find((k) => /^(slug|handle|code)$/i.test(k));
                if (slugKey) {
                    await prisma[delegate].upsert({
                        where: { [slugKey]: row[slugKey] },
                        update: {},
                        create: row,
                    });
                } else {
                    await prisma[delegate].create({ data: row });
                }
            } catch (e) {
                console.warn(`  • Row skipped (${model.name}):`, shortErr(e));
            }
        }
    }
}

function getDelegateName(modelName) {
    // Prisma client uses camelCase delegate: e.g., Course -> course, BlogPost -> blogPost
    return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function shortErr(e) {
    const msg = (e && e.message) ? e.message : String(e);
    return msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
}

/* ---------- run ---------- */
main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });