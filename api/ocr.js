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
        'gemini-1.5-pro',
        'gemini-pro-latest',
        'gemini-3.1-pro',
        'gemini-1.5-flash',
        'gemini-3.5-flash',
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
                            { text: "You are a precise OCR assistant specializing in reading handwritten Indonesian fish invoice tables. Extract name (IKAN), weight (KILO), and price (MODAL) from the image. Rules:\n1. Pay extreme attention to the shapes of handwritten digits. Do not confuse '6' with '0' (e.g., '6.8' must not be read as '0.8').\n2. Commas in Indonesian handwriting represent decimals (e.g., '2,5' or '6,8' means '2.5' or '6.8'). Convert them to dot '.' decimals.\n3. DO NOT round or truncate numbers (e.g., '2.5' or '2,5' must be extracted as '2.5', not '2').\n4. Return ONLY a valid JSON array of objects with keys: 'name', 'kilo', and 'modal'. If 'modal' is missing, leave it empty. Only return the raw JSON, no markdown tags." },
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
                
                // Jika error adalah high demand, rate limit, atau overload, coba model berikutnya
                if (response.status === 429 || response.status === 503 || errorMessage.toLowerCase().includes('demand') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
                    continue;
                } else {
                    // Untuk error fatal lain (misal API key salah, bad request, dll), langsung hentikan
                    return res.status(response.status || 500).json({ error: lastError.message });
                }
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
