const crypto = require('crypto');
const https = require('https');

const accessKey = process.env.VOLC_ACCESS_KEY;
const secretKey = process.env.VOLC_SECRET_KEY;

const host = 'visual.volcengineapi.com';
const actionSubmit = 'CVSync2AsyncSubmitTask';
const actionGet = 'CVSync2AsyncGetResult';
const version = '2022-08-31';
const service = 'cv';

function signString(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function getAuthorization(date, canonicalRequest, signedHeaders) {
  const hashedRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const scope = `${date}/${service}/request`;
  const stringToSign = `HMAC-SHA256\n${date}\n${scope}\n${hashedRequest}`;

  const kDate = signString(`VOLC${secretKey}`, date);
  const kService = signString(kDate, service);
  const kSig = signString(kService, 'request');
  const signature = crypto.createHmac('sha256', kSig).update(stringToSign).digest('hex');

  return `HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function getTime() {
  return new Date().toISOString().replace(/[:-]|\..*$/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST supported.' });
  }

  const prompt = "帮我生成一张证件照，白底，一寸大小，毛发细腻，超高清画质，8K";
  const date = getTime();
  const body = JSON.stringify({
    req_key: "jimeng_t2i_v30",
    prompt,
    seed: -1,
    width: 1024,
    height: 1024
  });

  const headersList = `content-type:application/json\nhost:${host}\nx-date:${date}\n`;
  const signedHeaders = 'content-type;host;x-date';
  const canonical = `POST\n/\nAction=${actionSubmit}&Version=${version}\n${headersList}\n${signedHeaders}\n${crypto.createHash('sha256').update(body).digest('hex')}`;
  const auth = getAuthorization(date, canonical, signedHeaders);

  const options = {
    hostname: host,
    path: `/?Action=${actionSubmit}&Version=${version}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Date': date,
      'Authorization': auth,
      'Host': host
    }
  };

  const request = https.request(options, (resp) => {
    let data = '';
    resp.on('data', (chunk) => data += chunk);
    resp.on('end', () => res.status(200).json(JSON.parse(data)));
  });

  request.on('error', (err) => res.status(500).json({ error: err.message }));
  request.write(body);
  request.end();
}
