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
                            { text: "You are an elite, highly precise OCR model specializing in transcribing handwritten Indonesian fish sales invoices.\nAnalyze the table columns: Name of fish (IKAN), weight (KILO), and price coefficient (MODAL).\n\nStrict rules to avoid errors:\n1. DOUBLE-CHECK every digit to avoid common handwriting confusions:\n   - Do not confuse '6' with '0' (e.g. '6.8' is NOT '0.8').\n   - Do not confuse '1' with '7' or '2'.\n   - Do not confuse '4' with '9'.\n   - Do not confuse '5' with '6' or '8'.\n2. DECIMALS: Commas in Indonesian handwriting represent decimals (e.g. '2,5' or '6,8' must be extracted as '2.5' or '6.8'). DO NOT ignore the decimal comma, and DO NOT round/truncate it (e.g. '2,5' is '2.5', NOT '2' and NOT '25').\n3. SEMANTIC CONTEXT:\n   - KILO values are weights, usually small numbers often with one decimal place (e.g., 2.5, 3.8, 6.8, 12.0).\n   - MODAL values are price coefficients in thousands, usually whole numbers (e.g., 20, 25, 30, 35, 45, 50, 60, 100, 110).\n4. OUTPUT FORMAT: Return ONLY a raw JSON array of objects with keys: 'name', 'kilo' (number), and 'modal' (number). If modal is missing, leave it empty. Do not include markdown formatting or extra text." },
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
            const jsonString = textResponse.replace(/```json|```/g, '').trim();
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
