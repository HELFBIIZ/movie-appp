// Official protocol: https://ai.opensubtitles.com/api-docs (quickstart and POST status).
// A submission is never retried automatically: a lost response may still have spent credits.
const hosts = new Set(['api.opensubtitles.com', 'vip-api.opensubtitles.com']);
function fileUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    !hosts.has(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    !/^\/api\/v1\/ai\/files\/\d+\/[^/]+$/.test(url.pathname)
  )
    throw new Error('Орчуулгын файлын хаяг буруу байна.');
  return url.href;
}
export function createSubtitleTranslationClient(getSession, request = fetch) {
  async function call(path, options = {}) {
    const { baseUrl, headers } = await getSession();
    const url = new URL(baseUrl);
    if (
      !hosts.has(url.hostname) ||
      url.protocol !== 'https:' ||
      url.port ||
      url.username ||
      url.password ||
      url.pathname !== '/api/v1' ||
      url.search ||
      url.hash
    )
      throw new Error('Invalid subtitle provider');
    return request(`${baseUrl}${path}`, {
      ...options,
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  }
  return {
    async prepare(content) {
      if (!content || Buffer.byteLength(content) > 1_000_000)
        throw new Error('Хадмалын файл хэт том эсвэл хоосон байна.');
      const [info, balance] = await Promise.all([
        call('/ai/info/translation'),
        call('/ai/credits'),
      ]);
      if (!info.ok || !balance.ok)
        throw new Error('Орчуулгын үйлчилгээтэй холбогдож чадсангүй. Дараа дахин оролдоорой.');
      const engines = await info.json();
      const credits = await balance.json();
      const engine = (engines.data ?? [])
        .filter(
          (item) =>
            typeof item.name === 'string' &&
            /^[a-zA-Z0-9_-]{1,80}$/.test(item.name) &&
            Number.isFinite(item.price) &&
            item.price > 0 &&
            ['en', 'mn'].every((language) =>
              item.languages_supported?.some((lang) => lang.language_code === language),
            ),
        )
        .sort((a, b) => a.price - b.price)[0];
      if (!engine)
        throw new Error('Монгол орчуулгын үйлчилгээ одоогоор байхгүй. MN хадмал файл нэмж болно.');
      const required = Math.max(1, Math.ceil([...content].length * engine.price));
      if (!Number.isFinite(credits.data?.credits) || credits.data.credits < required)
        throw new Error(
          'Автомат орчуулга түр боломжгүй байна. Монгол хадмал сонгох эсвэл өөрийн MN .vtt файлыг нэмээрэй.',
        );
      return { engine: engine.name };
    },
    async start(content, engine) {
      const form = new FormData();
      form.set('file', new Blob([content], { type: 'application/x-subrip' }), 'english.srt');
      form.set('api', engine);
      form.set('translate_from', 'en');
      form.set('translate_to', 'mn');
      const response = await call('/ai/translate', { method: 'POST', body: form });
      if (!response.ok)
        throw new Error(
          'Орчуулгын хүсэлт баталгаажаагүй. Давхар хүсэлт эхлүүлэхгүйгээр түр хүлээгээрэй.',
        );
      const data = await response.json();
      if (
        typeof data.correlation_id !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(data.correlation_id)
      )
        throw new Error('Орчуулгын хүсэлт баталгаажаагүй.');
      return data.correlation_id;
    },
    async poll(id) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('Invalid translation job');
      const response = await call(`/ai/translation/${id}`, { method: 'POST' });
      if (!response.ok) throw new Error('Орчуулгын явцыг шалгаж чадсангүй. Дахин шалгаарай.');
      const data = await response.json();
      if (['CREATED', 'PENDING'].includes(data.status)) return { status: 'pending' };
      if (data.status !== 'COMPLETED' || data.data?.quality?.valid !== true)
        return { status: 'failed' };
      const url = fileUrl(data.data?.url);
      const { headers } = await getSession();
      const result = await request(url, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      if (!result.ok || Number(result.headers.get('content-length')) > 2_000_000)
        throw new Error('Орчуулгын файлыг татаж чадсангүй.');
      const content = await result.text();
      if (Buffer.byteLength(content) > 2_000_000) throw new Error('Орчуулгын файл хэт том байна.');
      return { status: 'completed', content };
    },
  };
}
