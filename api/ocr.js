// api/ocr.js (Vercel Serverless Function)
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { image } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key Gemini belum disetting di Vercel.' });
    }
    if (!image) {
        return res.status(400).json({ error: 'Tidak ada data gambar yang dikirim.' });
    }

    // Daftar model: Prioritaskan model Pro untuk akurasi tulisan tangan tingkat tinggi, lalu fallback ke Flash jika overload
    const models = [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-pro-latest',
        'gemini-flash-latest'
    ];

    let lastError = null;
    let success = false;
    let result = null;

    for (const model of models) {
        try {
            console.log(`Mencoba memproses OCR menggunakan model: ${model}`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "You are an elite, highly precise OCR model specializing in transcribing handwritten Indonesian fish sales invoices.\nAnalyze the table columns: Name of fish (IKAN), weight (KILO), and price coefficient (MODAL).\n\nStep-by-Step Execution:\n1. TRANSCRIPTION DRAFT: First, transcribe each row of the table line-by-line under a 'DRAFT TRANSCRIPTION' section. For each line, double-check if there is a decimal comma or separator in KILO (e.g. '2,5' is '2.5', NOT '25' or '2') and check the digits carefully to avoid confusing 1/7/2, 4/9, 5/6/8/0.\n2. FISH NAMES DICTIONARY & CORRECTION:\n   - Standardize all fish names to Title Case and fix common handwriting misreadings:\n     * 'Kpt' / 'kpt' = Kepiting (e.g., 'Kepiting Bs', 'Kepiting Bt', 'Kepiting 3')\n     * 'Udk' / 'udk' = Udang (e.g., 'Udang Bs', 'Udang k', 'Udang Kb')\n     * 'Cu' / 'cumi' = Cumi\n     * 'Ck' = Cakalang (e.g., 'Cakalang', 'Cakalang Merah')\n     * 'Ckm' = Ckm (do NOT write 'Ctm' or 'ctm')\n     * 'Kkm' = Kkm (e.g., 'Kkm F', 'Kkm Lemah' - do NOT write 'Ktm' or 'ktm')\n     * 'Jebung' / 'jebung' = Jebung (do NOT write 'Jbung')\n     * 'Hlpau' / 'halipau' = Halipau (e.g., 'Halipau T', 'Halipau B' - do NOT write 'tipau')\n     * 'Cd' / 'Codong' = Codong (do NOT write 'Bodong')\n     * 'Cd His' / 'Condong Hisap' / 'Ctb His' = Condong Hisap\n     * 'Ruca' = Rucah (do NOT write 'puca')\n     * 'Janas' = Janas (e.g., 'Janas B', 'Janas F' - do NOT write 'Janas k')\n     * 'Ketambak' / 'ktambak' = Ketambak (e.g., 'Ketambak F' - do NOT write 'Ktambak k')\n     * Suffixes must be exactly: 'Bs' (not 'BS'), 'Kb' (not 'KB'), 'Bt' (not 'BT'), 'F' (not 'k' or 'K'), 'T' (not 't'), and 'k' (not 'K').\n3. DECIMALS & REASONABLENESS CHECK:\n   - KILO values are weights, usually small decimal numbers (e.g. 2.5, 3.8, 6.8, 12.0, 144.4).\n   - Do NOT confuse '5' with '9' (e.g., '0.5' must NOT be read as '0.9'). Look closely at the top of the digit to see if it is closed (9) or open/flat (5).\n   - If you read a KILO value as a large integer (e.g., '25' or '68'), double-check if there is a subtle comma. If so, it must be '2.5' or '6.8'.\n4. MODAL / PRICE COLUMN (CRITICAL):\n   - PREVENT ROW-ALIGNMENT SHIFT: Be extremely careful not to shift columns. Do NOT mix numbers from the next row (for example, if the next row has weight '3', do not read that '3' as the price of the current row).\n   - If the price column is blank, empty, crossed out, has a dash '-', or has just a letter 'k' with no number (e.g. '@k' or '@0k'), you MUST set 'modal' to null. Do NOT invent, shift, or guess numbers (e.g. for '@k' on 'Udang KB', 'modal' must be null, NOT 3).\n5. OUTPUT FORMAT: Finally, output the final result as a valid JSON array of objects with keys: 'name', 'kilo' (number), and 'modal' (number or null) inside a ```json ... ``` code block. Do not write anything else after the JSON code block." },
                            { inline_data: { mime_type: "image/jpeg", data: image.includes(',') ? image.split(',')[1] : image } }
                        ]
                    }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error?.message || 'Unknown Error';
                console.warn(`Model ${model} gagal: ${errorMessage}`);
                lastError = new Error(`Google API Error (${model}): ${errorMessage}`);
                
                // Jika model gagal, coba model berikutnya di dalam daftar
                continue;
            }

            if (!data.candidates || !data.candidates[0]) {
                console.warn(`Model ${model} tidak mengembalikan candidates.`);
                lastError = new Error(`Model ${model} tidak memberikan jawaban.`);
                continue;
            }

            const textResponse = data.candidates[0].content.parts[0].text;
            
            // Ekstrak blok JSON menggunakan regex
            const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || textResponse.match(/(\[\s*\{[\s\S]*?\}\s*\])/);
            if (!jsonMatch) {
                console.error("Respon AI tidak mengandung JSON:", textResponse);
                throw new Error("Format hasil pembacaan AI tidak valid.");
            }
            const jsonString = jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[0].trim();
            result = JSON.parse(jsonString);
            success = true;
            console.log(`Sukses menggunakan model: ${model}`);
            break; // Berhasil, keluar dari loop
        } catch (err) {
            console.error(`Error pada model ${model}:`, err);
            lastError = err;
            // Lanjut ke model berikutnya jika ada error jaringan/sistem
        }
    }

    if (success) {
        return res.status(200).json(result);
    } else {
        return res.status(500).json({ error: lastError ? lastError.message : 'Semua model Gemini gagal memproses gambar.' });
    }
}
