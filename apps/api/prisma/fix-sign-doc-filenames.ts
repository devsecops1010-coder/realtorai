/**
 * One-shot repair: fix Hebrew (or other non-ASCII) filenames on SignDocument
 * rows that were uploaded before commit fixing the latin1→utf-8 decode in
 * the multipart upload handler.
 *
 * Strategy:
 *   1. Find every SignDocument whose originalFileName has a latin1-ish
 *      mojibake fingerprint (the high-bit characters that appear when UTF-8
 *      bytes are misread as latin1: × Ø ◊ ƒ etc.)
 *   2. Re-decode via Buffer.from(name, 'latin1').toString('utf-8').
 *   3. If the result yields Hebrew/Arabic/CJK glyphs, update the row.
 *   4. Otherwise leave it alone (we don't risk replacing innocent strings).
 *
 * Idempotent — re-running on already-fixed rows is a no-op because they
 * don't match the mojibake fingerprint anymore.
 *
 * Run: pnpm --filter api tsx prisma/fix-sign-doc-filenames.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HEBREW_OR_ARABIC_OR_CJK = /[֐-׿؀-ۿ一-鿿]/;
// The telltale chars that show up when UTF-8 Hebrew is read as latin1:
//   D7 (0xD7 = ×) is the high byte of every Hebrew letter in UTF-8.
//   We don't require ALL of these — just enough that something looks off.
const MOJIBAKE_HINT = /[×Ø¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/;

function tryDecode(s: string): string | null {
  try {
    const decoded = Buffer.from(s, 'latin1').toString('utf-8');
    if (HEBREW_OR_ARABIC_OR_CJK.test(decoded)) return decoded;
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const all = await prisma.signDocument.findMany({
    select: { id: true, originalFileName: true, tenantId: true },
  });

  let candidates = 0;
  let fixed = 0;
  let skipped = 0;

  for (const doc of all) {
    // Already proper Unicode? Skip.
    if (HEBREW_OR_ARABIC_OR_CJK.test(doc.originalFileName)) {
      continue;
    }
    // Doesn't smell like mojibake — leave it.
    if (!MOJIBAKE_HINT.test(doc.originalFileName)) {
      continue;
    }
    candidates += 1;

    const decoded = tryDecode(doc.originalFileName);
    if (!decoded) {
      skipped += 1;
      console.log(`  ? skip: ${doc.id}  (no clean decode)`);
      continue;
    }

    await prisma.signDocument.update({
      where: { id: doc.id },
      data: { originalFileName: decoded },
    });
    fixed += 1;
    console.log(`  ✓ ${doc.id}`);
    console.log(`    was: ${doc.originalFileName}`);
    console.log(`    now: ${decoded}`);
  }

  console.log(`\nDone. candidates=${candidates}, fixed=${fixed}, skipped=${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
