// Offline OCR with macOS Vision. Usage: ocr <image>...   → writes <image>.txt next to each image.
// Prints "path<TAB>chars<TAB>confidence" per image so the caller can spot bad results.
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("\(path)\t0\tERROR"); continue
    }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.recognitionLanguages = (try? req.supportedRecognitionLanguages().contains("vi-VT")) == true ? ["vi-VT", "en-US"] : ["en-US"]
    req.usesLanguageCorrection = true
    do { try VNImageRequestHandler(cgImage: cg).perform([req]) } catch { FileHandle.standardError.write("\(path): \(error)\n".data(using: .utf8)!) }
    let obs = req.results ?? []
    // reading order: detect a 2-column layout (many narrow boxes starting right of centre),
    // then read left column top→bottom, then right column; otherwise plain top→bottom.
    let right = obs.filter { $0.boundingBox.minX > 0.45 && $0.boundingBox.width < 0.55 }
    let twoCol = obs.count > 6 && Double(right.count) > Double(obs.count) * 0.25
    func col(_ o: VNRecognizedTextObservation) -> Int { twoCol && o.boundingBox.minX > 0.45 && o.boundingBox.width < 0.55 ? 1 : 0 }
    let lines = obs.sorted { a, b in
        if col(a) != col(b) { return col(a) < col(b) }
        return abs(a.boundingBox.midY - b.boundingBox.midY) > 0.01 ? a.boundingBox.midY > b.boundingBox.midY : a.boundingBox.minX < b.boundingBox.minX
    }.compactMap { $0.topCandidates(1).first }
    let text = (twoCol ? "[2 columns: left column first, then right]\n" : "") + lines.map { $0.string }.joined(separator: "\n")
    let conf = lines.isEmpty ? 0 : lines.map { Double($0.confidence) }.reduce(0, +) / Double(lines.count)
    try? text.write(toFile: path + ".txt", atomically: true, encoding: .utf8)
    print("\(path)\t\(text.count)\t\(String(format: "%.2f", conf))")
}
