import Link from "next/link"
import {
  BookOpen,
  Castle,
  Clapperboard,
  Coins,
  PlayCircle,
  ReceiptText,
  Settings2,
  Sparkles,
  Subtitles,
  UserRound,
} from "lucide-react"

const khanAccount = {
  name: "Taivanbaatar",
  iban: "MN550005005771031864",
}

const steps = [
  {
    icon: UserRound,
    title: "Бүртгэл үүсгэх, нэвтрэх",
    body: [
      "Баруун дээд буланд байгаа «Нэвтрэх» товчийг дарж /login хуудас руу орно.",
      "«Create account & sign in» товчоор имэйл болон нууц үгээ оруулан шинэ бүртгэл үүсгэнэ.",
      "Дараа удаа «Sign in» табаар нэвтэрнэ.",
      "Нэвтэрсэн хэрэглэгч хадмал, watchlist, шүүмж, XP-г бүрэн ашиглаж, VIP дэмжлэгтэй кино үзэх эрхтэй болно.",
    ],
  },
  {
    icon: Clapperboard,
    title: "Кино хэрхэн олох, үзэх",
    body: [
      "Эх хуудсанд тавигдсан Featured кино болон «Movies», «K-Dramas», «Western» цэснээс сонгоно.",
      "Дээд талын хайлтын талбараар нэрээр хайна (жишээ: «Godfather», «Дамдин»).",
      "«New Releases», «Top Rated», генрийн цэсээр шүүдэг.",
      "Киноны карт дээр дарж дэлгэрэнгүй хуудас руу орж, «▶ Watch now» товчоор үзнэ.",
      "Тоглуулагч дотор 3 горим байна: ▶ Player 1 (vidsrc), ▶ Player 2 (VidCore), ▶ Subtitles ✓ (манай хадмалтай тоглуулагч). Шаардлагатай тохиолдолд бусад горим руу шилжинэ.",
      "Хэрэв кино VIP шаардлагатай бөгөөд та идэвхтэй гишүүнчлэлгүй бол «Get VIP» товч харагддаг.",
      "Ангит цуврал (Tv series) бол «Season» болон «Episode» сонголтоор ангиа солино.",
    ],
  },
  {
    icon: ReceiptText,
    title: "Төлбөр хэрхэн төлөх вэ / (Khan Bank)",
    body: [
      "«Pricing» (Үнийн жагсаалт) хуудас руу орно — зарим товчлуур дээр шууд холбоос байдаг.",
      "Хүссэн төлөвлөгөөгөө сонгоно: Долоо хоног (WEEKLY 1,500₮ / 7 хоног), Сарын (MONTHLY 5,900₮ / 30 хоног) эсвэл 2–9 сар хүртэлх уян хатан төлөвлөгөө.",
      `Khan Bank руу шилжүүлэг хийх: Дансны эзэмшигч «${khanAccount.name}», Дансны дугаар «${khanAccount.iban}» — төлөвлөгөөний дүнг шилжүүлнэ.`,
      "Шилжүүлсний дараа хуудасны «Pay by Khan Bank transfer» картанд: гүйлгээний дэлгэрэнгүй (дансны дугаар, гүйлгээний ID) эсвэл чек-зураг, утасны дугаараа бөглөж «Submit receipt» дарна.",
      "Манай администратор баримтыг шалгаад баталгаажуулна — VIP хэдэн минутын дотор автоматаар сунгагддаг.",
      "Мөн «Buy with card (demo)» — хөгжүүлэлтийн горим, «QPay ₮» — QPay QR төлбөрийн сонголтууд байдаг (тохиргооноос хамаарч идэвхтэй болдог).",
      "Кодтой бол «XP shop»-ийн доод талд, эсвэл /pricing хуудсыг нэвтрээд бүртгүүлсэн хэрэглэгч кодоо оруулан идэвхжүүлнэ.",
    ],
  },
  {
    icon: Subtitles,
    title: "Хадмал (Subtitle) хэрхэн нээх вэ",
    body: [
      "Киноны дэлгэрэнгүй хуудсанд «Mongolian Subtitles» товч байгаа бол түүн дээр дарна.",
      "Тоглуулагч дээр «▶ Subtitles ✓» (манай тоглуулагч) режимийг сонгоно — хадмал зөвхөн энэ тоглуулагч дээр ажилладаг.",
      "Киноны доорх «Subtitles» самбараас хэлээ сонгоно (Монгол / Англи / бусад).",
      "Хадмал файл «.vtt/.srt» форматаар серверт бэлдсэн байдаг; олдохгүй бол «Generate» эсвэл тохирох товчоор дахин үүсгэж болно.",
      "Нэг удаа «Subtitles» сонгосон бол дараагийн кинонууд ч мөн адил нээгддэг.",
    ],
  },
  {
    icon: Sparkles,
    title: "XP ба урамшууллын систем",
    body: [
      "XP цуглуулах боломжууд: өдөр бүр нэвтрэх, кино үзэх, шүүмж бичих, сэтгэгдэл өгөх, үнэлэх.",
      "XP-г цаг хугацааны хувьд нэмж авах редко (код) болон XP дэлгүүрээс урамшууллаар солино.",
      "XP оноо, зэрэглэлээ хуудасны дээд хэсгээс харж болно.",
    ],
  },
  {
    icon: PlayCircle,
    title: "Тэмдэглэл, шүүмж, хадгалах",
    body: [
      "Киноны дэлгэрэнгүй хуудсыг нэвтрээд «Watchlist»-д нэмэх боломжтой бөгөөд «Watchlist» цэсээс бүрэн харж болно.",
      "Үзсэн кинонд ★ үнэлгээ өгч, сэтгэгдэл (шүүмж) бичиж бусадтай хуваалцана.",
    ],
  },
]

const faqs = [
  {
    q: "VIP гишүүнчлэл юу өгдөг вэ?",
    a: "VIP гишүүнчлэлээр тоглуулах боломжтой бүх кино, ангиудыг үзэх эрх нээгдэнэ. Эрхийн хугацаа богиносвол дахин төлбөр төлж сунгана.",
  },
  {
    q: "Төлбөр хэзээ баталгаажих вэ?",
    a: "Хүсэлтийг администратор гараар шалгадаг. Ихэвчлэн хэдхэн минутад баталгаажуулдаг — хэрэв илүү хугацаа бол hello@vxnta.app хаягаар холбогдоно уу.",
  },
  {
    q: "Хадмал яагаад Player 1/2 дээр харагдахгүй байна вэ?",
    a: "Хадмал зөвхөн «▶ Subtitles ✓» тоглуулагч дээр ажилладаг. Дээрх товчийг дарж шилжинэ үү.",
  },
  {
    q: "Хэрэв кино «Streaming unavailable» гэж гарвал?",
    a: "Тухайн киног яг одоо эх сурвалжаас авах боломжгүй байна. Киноны сүлжээ унтарсан эсвэл тухайн бүс нутагт байхгүй байж болзошгүй. Бусад киног үзэж болно.",
  },
  {
    q: "Нууц үгээ мартчихвал?",
    a: "Хэсэгчилсэн тусламж авахын тулд hello@vxnta.app хаягаар холбогдоно уу.",
  },
  {
    q: "Сайт Монголоор бүрэн ажилладаг уу?",
    a: "Интерфэйс, хадмал болон энэхүү гарын авлага Монголоор байна. Хэрэглэгчийн үйлдлүүд (төлбөр, шүүмж, XP) бүрэн ажилладаг.",
  },
]

export const metadata = {
  title: "Тусламж — VXNTA хэрэглэгчийн гарын авлага",
  description: "VXNTA-г хэрхэн ашиглах, кино үзэх, төлбөр төлөх, хадмал нээх тухай бүрэн гарын авлага монгол хэл дээр.",
}

export default function HelpPage() {
  return (
    <main className="relative">
      <div className="container max-w-5xl px-4 py-12 md:py-16">
        <header className="animate-fade-in-up">
          <p className="text-sm uppercase tracking-[0.25em] text-[#c9a227]">Тусламж / Help</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl gradient-text">
            Хэрэглэгчийн гарын авлага
          </h1>
          <p className="mt-4 max-w-2xl text-[#cdbf9c]">
            VXNTA-г эхнээс ашиглах бүх заавар энд цугларсан. Доорх хэсгүүдийг уншиж,
            танилцан, ямар ч асуултад хялбар хариулаарай.
          </p>
        </header>

        <div className="mt-10 grid gap-5 animate-fade-in-up delay-100">
          {steps.map((s, i) => (
            <section key={s.title} className="luxe-card rounded-2xl p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c9a227]/15 text-gold-soft ring-1 ring-[#d6b456]/30">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl text-gold-soft">{i + 1}.</span>
                    <h2 className="font-display text-2xl text-[#e9e2d3]">{s.title}</h2>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {s.body.map((li, j) => (
                      <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-[#cdbf9c]">
                        <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#d6b456]/70" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 luxe-card rounded-2xl p-6 md:p-8 animate-fade-in-up delay-200">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-gold-soft" />
            <h2 className="font-display text-2xl text-[#e9e2d3]">Байнга асуудаг асуултууд (FAQ)</h2>
          </div>
          <div className="mt-5 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-[#d6b456]/20 bg-black/20 transition-colors open:border-[#d6b456]/45">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-[#e9e2d3]">
                  {f.q}
                  <Settings2 className="h-4 w-4 shrink-0 text-gold-soft transition-transform group-open:rotate-45" />
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-[#cdbf9c]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[#d6b456]/25 bg-gradient-to-br from-[#c9a227]/10 to-transparent p-6 md:p-8 text-center animate-fade-in-up delay-300">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#c9a227]/15 text-gold-soft ring-1 ring-[#d6b456]/30">
            <Coins className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-2xl text-[#e9e2d3]">Хэзээ эхлэхээ хайж байна уу?</h2>
          <p className="mx-auto mt-2 max-w-xl text-[15px] text-[#cdbf9c]">
            Нэвтрээд, дуртай киногаа олоод, нэг удаа төлбөр төлж VIP болно уу — үлдсэнийг бид шийднэ.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/movies"
              className="rounded-xl bg-gradient-to-r from-[#c9a227] via-[#e7c779] to-[#c9a227] px-6 py-3 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110 shadow-[0_10px_28px_-10px_rgba(214,180,86,0.5)]"
            >
              Кино үзэх
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-[#d6b456]/40 bg-transparent px-6 py-3 text-sm font-semibold text-gold-soft transition-all hover:bg-[#d6b456]/10"
            >
              Төлбөрийн хуудас
            </Link>
            <a
              href="mailto:hello@vxnta.app"
              className="rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-[#cdbf9c] transition-all hover:border-[#d6b456]/40 hover:text-white"
            >
              Холбогдох
            </a>
          </div>
          <p className="mt-5 text-sm text-[#cdbf9c]">
            Утас:{" "}
            <a href="tel:+97699606540" className="font-semibold text-gold-soft hover:text-amber-200">
              +976 9960 6540
            </a>
            {" · "}
            <a href="tel:+97666330876" className="font-semibold text-gold-soft hover:text-amber-200">
              +976 6633 0876
            </a>
          </p>
        </section>

        <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-500">
          Төлбөрийн данс: {khanAccount.name} • {khanAccount.iban}
        </p>
      </div>

      {/* Decorative brand marks */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-0 select-none text-[180px] text-[#c9a227]/5">
        <Castle className="h-[160px] w-[160px]" />
      </div>
    </main>
  )
}