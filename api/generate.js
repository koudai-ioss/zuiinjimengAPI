// api/generate.js
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send({ message: 'Only POST requests allowed' });
    return;
  }

  const { image_base64, prompt } = req.body;

  if (!image_base64 || !prompt) {
    return res.status(400).json({ error: 'Missing image_base64 or prompt' });
  }

  const accessKey = process.env.JIMENG_ACCESS_KEY_ID;
  const secretKey = process.env.JIMENG_SECRET_KEY;

  const url = 'https://visual.volcengineapi.com/?Action=TextToImage&Version=2023-10-31';

  const timestamp = Math.floor(Date.now() / 1000);
  const signStr = `${accessKey}${secretKey}${timestamp}`;
  const sign = crypto.createHash('sha256').update(signStr).digest('hex');

  const body = {
    prompt: prompt,
    base64_image: image_base64,
    aspect_ratio: '1:1',
    resolution: '1024*1024',
    model_version: '2.0'
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Date': timestamp,
    'X-Access-Key': accessKey,
    'X-Signature': sign
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
