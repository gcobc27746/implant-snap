#!/usr/bin/env node
/**
 * OCR Parameter Tuner for ImplantSnap
 *
 * Crops ocrTooth + ocrExtra from each example screenshot,
 * tries every preprocessing combination, scores against ground truth,
 * and prints the best parameters.
 *
 * Usage:
 *   node scripts/ocr-tune.mjs
 */

import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { createWorker, PSM } from 'tesseract.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SCREENSHOT_DIR = join(ROOT, 'docs/example/screenshot')

// ── Ground truth ──────────────────────────────────────────────────────────────
// Read manually from the example screenshots.
// Verify with --inspect output if anything looks wrong.
const GROUND_TRUTH = [
  { file: 'Snipaste_2026-03-01_00-41-00.png', tooth: '21', length: '13.0', diameter: '4.0' },
  { file: 'Snipaste_2026-03-01_00-41-53.png', tooth: '37', length: '10.0', diameter: '4.5' },
  { file: 'Snipaste_2026-03-01_00-42-15.png', tooth: '16', length: '11.5', diameter: '4.5' },
  { file: 'Snipaste_2026-03-01_00-42-29.png', tooth: '37', length: '8.5',  diameter: '4.5' },
  { file: 'Snipaste_2026-03-01_00-42-43.png', tooth: '13', length: '11.5', diameter: '4.5' },
]

// ── OCR crop regions (from implant-snap-config.json) ─────────────────────────
const REGIONS = {
  ocrTooth: { x: 58,  y: 321, width: 160, height: 43  },
  ocrExtra: { x: 538, y: 635, width: 194, height: 172 },
}

// ── Parameter grid ────────────────────────────────────────────────────────────
const GRID = {
  contrast:  [1.0, 1.5, 2.0, 2.5, 3.0],
  scale:     [2.0, 3.0, 4.0],
  threshold: [0, 80, 100, 128, 150],
  sharpen:   [true, false],
}

function* allCombinations() {
  for (const contrast  of GRID.contrast)
  for (const scale     of GRID.scale)
  for (const threshold of GRID.threshold)
  for (const sharpen   of GRID.sharpen)
    yield { grayscale: true, contrast, scale, threshold, sharpen }
}

// ── Preprocessing (mirrors OcrPreprocessor.ts) ────────────────────────────────
async function preprocess(buffer, opts) {
  let p = sharp(buffer)
  if (opts.grayscale)      p = p.grayscale()
  if (opts.contrast !== 1) p = p.linear(opts.contrast, -(128 * opts.contrast - 128))
  if (opts.sharpen)        p = p.sharpen({ sigma: 1.5 })
  if (opts.scale !== 1) {
    const { width, height } = await sharp(buffer).metadata()
    p = p.resize(
      Math.round(width  * opts.scale),
      Math.round(height * opts.scale),
      { kernel: 'lanczos3' }
    )
  }
  if (opts.threshold > 0)  p = p.threshold(opts.threshold)
  return p.png().toBuffer()
}

// ── Parsing (mirrors OcrParser.ts) ────────────────────────────────────────────
const TOOTH_RE    = /\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/
const LENGTH_RE   = /[长長民代八]\s*[度庆]\s*=\s*(\d+\.?\d*)\s*m/i
const DIAMETER_RE = /直\s*[径經徑人]?\s*[径經徑笃]?\s*=\s*(\d+\.?\d*)\s*m/i
const VALUE_MM_RE = /=\s*([<{(]?)(\d+\.?\d*)\s*m/gi

function normLen(v)  { const n = parseFloat(v); return n > 20 ? (n/10).toFixed(1) : (v.includes('.') ? v : `${n}.0`) }
function normDia(v)  { const n = parseFloat(v); return n >= 10 ? (n/10).toFixed(1) : (v.includes('.') ? v : `${n}.0`) }

function parse(toothText, extraText) {
  const toothM = TOOTH_RE.exec(toothText)
  const tooth  = toothM ? toothM[1] : null

  let length = null, diameter = null

  const lm = LENGTH_RE.exec(extraText)
  if (lm) length = normLen(lm[1])

  const dm = DIAMETER_RE.exec(extraText)
  if (dm) diameter = normDia(dm[1])

  if (!length || !diameter) {
    const vals = []; let m
    const re = new RegExp(VALUE_MM_RE.source, VALUE_MM_RE.flags)
    while ((m = re.exec(extraText)) !== null)
      vals.push(m[1] ? `4${m[2]}` : m[2])
    if (vals.length >= 2) {
      if (!length)   length   = normLen(vals[0])
      if (!diameter) diameter = normDia(vals[1])
    }
  }

  return { tooth, length, diameter }
}

// ── Scoring: 2 pts per exact field match, max 6 per image ────────────────────
function scoreOne(parsed, gt) {
  return (parsed.tooth    === gt.tooth    ? 2 : 0)
       + (parsed.length   === gt.length   ? 2 : 0)
       + (parsed.diameter === gt.diameter ? 2 : 0)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   ImplantSnap OCR Parameter Tuner        ║')
  console.log('╚══════════════════════════════════════════╝\n')

  // Pre-crop every screenshot once
  console.log('Cropping example screenshots...')
  const images = await Promise.all(
    GROUND_TRUTH.map(async (gt) => {
      const buf = await readFile(join(SCREENSHOT_DIR, gt.file))
      const [toothCrop, extraCrop] = await Promise.all([
        sharp(buf).extract({ left: REGIONS.ocrTooth.x, top: REGIONS.ocrTooth.y, width: REGIONS.ocrTooth.width, height: REGIONS.ocrTooth.height }).png().toBuffer(),
        sharp(buf).extract({ left: REGIONS.ocrExtra.x, top: REGIONS.ocrExtra.y, width: REGIONS.ocrExtra.width, height: REGIONS.ocrExtra.height }).png().toBuffer(),
      ])
      return { gt, toothCrop, extraCrop }
    })
  )
  console.log(`  Loaded ${images.length} images.\n`)

  const worker = await createWorker(['chi_sim'])

  const combos   = [...allCombinations()]
  const MAX_SCORE = GROUND_TRUTH.length * 6  // 5 × 6 = 30

  console.log(`Parameter grid: contrast×${GRID.contrast.length} scale×${GRID.scale.length} threshold×${GRID.threshold.length} sharpen×${GRID.sharpen.length}`)
  console.log(`Total combos : ${combos.length}  |  Max score : ${MAX_SCORE}\n`)

  // ── Show baseline (current DEFAULT_PREPROCESS) first ─────────────────────
  const BASELINE = { grayscale: true, contrast: 1.0, scale: 3.0, threshold: 0, sharpen: true }
  console.log('── Baseline (current defaults) ──')
  {
    let bs = 0
    for (const { gt, toothCrop, extraCrop } of images) {
      const [pT, pE] = await Promise.all([preprocess(toothCrop, BASELINE), preprocess(extraCrop, BASELINE)])
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE })
      const { data: { text: tt } } = await worker.recognize(pT)
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      const { data: { text: et } } = await worker.recognize(pE)
      const parsed = parse(tt.trim(), et.trim())
      const s = scoreOne(parsed, gt)
      bs += s
      const ok = (a, b) => a === b ? '✓' : `✗(${a ?? '—'})`
      console.log(`  ${gt.file.slice(-12)}: tooth=${ok(parsed.tooth,gt.tooth)} len=${ok(parsed.length,gt.length)} dia=${ok(parsed.diameter,gt.diameter)}  [${s}/6]`)
    }
    console.log(`  Baseline total: ${bs}/${MAX_SCORE}\n`)
  }

  // ── Grid search ───────────────────────────────────────────────────────────
  console.log('── Running grid search... ──')
  const allResults = []
  let done = 0
  const start = Date.now()

  for (const opts of combos) {
    let totalScore = 0
    const details  = []

    for (const { gt, toothCrop, extraCrop } of images) {
      const [pT, pE] = await Promise.all([preprocess(toothCrop, opts), preprocess(extraCrop, opts)])

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE })
      const { data: { text: tt, confidence: tc } } = await worker.recognize(pT)

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      const { data: { text: et, confidence: ec } } = await worker.recognize(pE)

      const parsed = parse(tt.trim(), et.trim())
      const s      = scoreOne(parsed, gt)
      totalScore  += s
      details.push({ gt, parsed, s, toothText: tt.trim(), extraText: et.trim(), toothConf: tc, extraConf: ec })
    }

    allResults.push({ opts, score: totalScore, details })
    done++

    const elapsed  = ((Date.now() - start) / 1000).toFixed(0)
    const bestSoFar = Math.max(...allResults.map(r => r.score))
    process.stdout.write(`  [${String(done).padStart(3)}/${combos.length}] elapsed: ${elapsed}s  best: ${bestSoFar}/${MAX_SCORE}\r`)
  }

  await worker.terminate()
  console.log(`\n  Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`)

  // ── Results ───────────────────────────────────────────────────────────────
  allResults.sort((a, b) => b.score - a.score)

  console.log('═══════════════════════════════════════════════')
  console.log('  TOP 10 RESULTS')
  console.log('═══════════════════════════════════════════════')
  for (const { opts, score: s } of allResults.slice(0, 10)) {
    const bar = '█'.repeat(Math.round(s / MAX_SCORE * 20)).padEnd(20)
    console.log(`[${bar}] ${String(s).padStart(2)}/${MAX_SCORE}  contrast=${opts.contrast} scale=${opts.scale} threshold=${String(opts.threshold).padStart(3)} sharpen=${opts.sharpen}`)
  }

  const best = allResults[0]
  console.log('\n═══════════════════════════════════════════════')
  console.log('  BEST PARAMETERS')
  console.log('═══════════════════════════════════════════════')
  console.log(JSON.stringify(best.opts, null, 2))

  console.log('\n═══════════════════════════════════════════════')
  console.log('  OCR DETAIL (best params)')
  console.log('═══════════════════════════════════════════════')
  for (const { gt, toothText, extraText, parsed, s, toothConf, extraConf } of best.details) {
    const ok = (a, b) => a === b ? '✓' : `✗(got:${a ?? '?'} exp:${b})`
    console.log(`\n[${gt.file}]  score=${s}/6`)
    console.log(`  tooth=${ok(parsed.tooth,gt.tooth)}  len=${ok(parsed.length,gt.length)}  dia=${ok(parsed.diameter,gt.diameter)}`)
    console.log(`  Tooth OCR (conf=${toothConf.toFixed(0)}%): "${toothText}"`)
    console.log(`  Extra OCR (conf=${extraConf.toFixed(0)}%): "${extraText.replace(/\n/g, ' | ')}"`)
  }

  // ── Tie-breaker: among same-score, prefer higher avg confidence ───────────
  const topScore = best.score
  const tied = allResults.filter(r => r.score === topScore)
  if (tied.length > 1) {
    const avgConf = r => r.details.reduce((s, d) => s + d.toothConf + d.extraConf, 0) / (r.details.length * 2)
    tied.sort((a, b) => avgConf(b) - avgConf(a))
    console.log(`\n  (${tied.length} combos tied at ${topScore}/${MAX_SCORE} — recommending highest avg confidence:)`)
    console.log(JSON.stringify(tied[0].opts, null, 2))
  }
}

main().catch(console.error)
