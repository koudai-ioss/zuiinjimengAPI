const crypto = require('crypto');
const https = require('https');

const accessKeyId = process.env.VOLC_ACCESS_KEY;
const secretKey = process.env.VOLC_SECRET_KEY;
const host = 'visual.volcengineapi.com';
const action = 'CVSync2AsyncSubmitTask';
const version = '2022-08-31';
const service = 'cv';

function getSignature(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function getAuthorization(date, canonicalRequest, signedHeaders) {
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const credentialScope = `${date}/${service}/request`;
  const stringToSign = `HMAC-SHA256\n${date}\n${credentialScope}\n${hashedCanonicalRequest}`;
  const kDate = getSignature(`VOLC${secretKey}`, date);
  const kService = getSignature(kDate, service);
  const kSigning = getSignature(kService, 'request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  return `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function getDate() {
  return new Date().toISOString().replace(/[:-]|\..*$/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const prompt = "帮我生成一张证件照，白底，一寸大小，毛发细腻，超高清画质，8K";
  const date = getDate();
  const body = JSON.stringify({
    req_key: "jimeng_t2i_v30",
    prompt,
    seed: -1,
    width: 1024,
    height: 1024
  });

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-date:${date}\n`;
  const signedHeaders = 'content-type;host;x-date';
  const canonicalRequest = `POST\n/\nAction=${action}&Version=${version}\n${canonicalHeaders}\n${signedHeaders}\n${crypto.createHash('sha256').update(body).digest('hex')}`;
  const authorization = getAuthorization(date, canonicalRequest, signedHeaders);

  const options = {
    hostname: host,
    path: `/?Action=${action}&Version=${version}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Date': date,
      'Authorization': authorization,
      'Host': host
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        res.status(200).json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: "Invalid JSON response", raw: data });
      }
    });
  });

  request.on('error', (e) => {
    res.status(500).json({ error: e.message });
  });

  request.write(body);
  request.end();
}