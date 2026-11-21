import type { Question, WordNote } from './types.ts';

export const SAMPLE_ID = 'scenechain-last-train-v1';
export const SAMPLE_TITLE = 'The Last Train';
export const sampleLines = [
  {
    en: 'The last train leaves in ten minutes.',
    mn: 'Сүүлчийн галт тэрэг арван минутын дараа хөдөлнө.',
  },
  { en: 'Mira has lost her ticket.', mn: 'Мира тасалбараа гээжээ.' },
  { en: 'Leo offers to help her find it.', mn: 'Лео түүнийг олоход нь туслахаар санал болгов.' },
  {
    en: 'They check the bench beside the platform.',
    mn: 'Тэд тавцангийн дэргэдэх сандлыг шалгана.',
  },
  { en: "The ticket is under Mira's bag.", mn: 'Тасалбар Мирагийн цүнхэн доор байна.' },
  {
    en: 'They board the train together, just in time.',
    mn: 'Тэд яг амжиж галт тэргэнд хамтдаа суулаа.',
  },
];
export const wordNotes: WordNote[] = [
  {
    word: 'last',
    meaning: 'сүүлчийн',
    context: 'Тухайн өдөр явах хамгийн сүүлчийн галт тэрэг.',
    example: 'This is the last bus tonight.',
    grammar: 'Last нь train нэр үгийг тодотгосон тэмдэг нэр.',
  },
  {
    word: 'train',
    meaning: 'галт тэрэг',
    context: 'Мира, Лео хоёрын суух гэж буй тээврийн хэрэгсэл.',
    example: 'We take the train to the city.',
    grammar: 'Тоологдох нэр үг. The train нь тодорхой галт тэрэг.',
  },
  {
    word: 'leaves',
    meaning: 'хөдөлнө',
    context: 'Энд явах, буудлаас хөдлөх гэсэн утгатай.',
    example: 'The bus leaves at nine.',
    grammar: 'Хуваарийг present simple-ээр хэлдэг; train ганц тоо тул -s авна.',
  },
  {
    word: 'lost',
    meaning: 'гээсэн',
    context: 'Мира тасалбараа одоо олж чадахгүй байна.',
    example: 'I have lost my keys.',
    grammar: 'Has lost нь present perfect: have/has + past participle. Lose → lost.',
  },
  {
    word: 'ticket',
    meaning: 'тасалбар',
    context: 'Галт тэргэнд суухад хэрэгтэй тасалбар.',
    example: 'Keep your ticket in your bag.',
    grammar: 'Тоологдох нэр үг: a ticket, two tickets.',
  },
  {
    word: 'offers',
    meaning: 'санал болгоно',
    context: 'Лео өөрөө санаачлан туслахыг хүсэж байна.',
    example: 'She offers to carry the bag.',
    grammar: 'Offer + to + verb: offers to help.',
  },
  {
    word: 'help',
    meaning: 'туслах',
    context: 'Лео Миратай хамт тасалбарыг хайна.',
    example: 'Can you help me find my phone?',
    grammar: 'Help + хүн + үйл үгийн үндэс: help her find.',
  },
  {
    word: 'find',
    meaning: 'олох',
    context: 'Алга болсон тасалбарыг хайж олох.',
    example: 'We need to find the station.',
    grammar: 'Find → found; энд help-ийн дараа үндсэн хэлбэрээр орно.',
  },
  {
    word: 'bench',
    meaning: 'урт сандал',
    context: 'Тавцангийн хажуугийн суух сандал.',
    example: 'They sit on a bench.',
    grammar: 'Тоологдох нэр үг: a bench; олон тоо benches.',
  },
  {
    word: 'beside',
    meaning: 'дэргэд',
    context: 'Сандлын байрлалыг тавцантай харьцуулж заана.',
    example: 'My bag is beside the door.',
    grammar: 'Байрлал заасан угтвар үг: beside + noun.',
  },
  {
    word: 'platform',
    meaning: 'тавцан',
    context: 'Зорчигчид галт тэрэг хүлээдэг буудлын тавцан.',
    example: 'The train arrives at platform two.',
    grammar: 'Энд технологийн platform бус, railway platform гэсэн нэр үг.',
  },
  {
    word: 'under',
    meaning: 'доор',
    context: 'Тасалбар цүнхэн доор нуугдсан байна.',
    example: 'The key is under the book.',
    grammar: 'Байрлал заасан угтвар үг: under + noun.',
  },
  {
    word: 'bag',
    meaning: 'цүнх',
    context: 'Мирагийн цүнх тасалбарыг халхалсан.',
    example: 'Her bag is on the bench.',
    grammar: "Mira's нь эзэмшлийг заана: Мирагийн.",
  },
  {
    word: 'board',
    meaning: 'тээврийн хэрэгсэлд суух',
    context: 'Энд галт тэргэнд орох, суух гэсэн үйл үг.',
    example: 'Passengers board the plane.',
    grammar: 'Board + тээврийн хэрэгсэл; board the train, нэмэлт угтвар үггүй.',
  },
  {
    word: 'together',
    meaning: 'хамтдаа',
    context: 'Мира, Лео хоёр хоёулаа галт тэргэнд суусан.',
    example: 'We study together after school.',
    grammar: 'Together нь board үйл үгийг тодотгосон дайвар үг.',
  },
  {
    word: 'time',
    meaning: 'цаг; энд амжих',
    context: 'Just in time нь хөдлөхөөс өмнө яг амжсан гэсэн хэлц.',
    example: 'We arrived just in time.',
    grammar: 'In time = хоцролгүй амжих. On time = товлосон цагтаа.',
  },
];
export function lookupWord(token: string): WordNote | undefined {
  return wordNotes.find((note) => note.word === token.toLowerCase().replace(/[^a-z]/g, ''));
}
export const contextQuestion: Question = {
  id: 'last-train-context-v1',
  prompt: 'Мира, Лео хоёр яагаад яарч байсан бэ?',
  choices: [
    'Сүүлчийн галт тэрэг удахгүй хөдлөх бөгөөд Мира тасалбараа олох хэрэгтэй байсан.',
    'Лео галт тэрэг жолооддог байсан.',
    'Тэд шинэ цүнх худалдаж авах гэж байсан.',
    'Галт тэрэг аль хэдийн явсан байсан.',
  ],
  answer: 'Сүүлчийн галт тэрэг удахгүй хөдлөх бөгөөд Мира тасалбараа олох хэрэгтэй байсан.',
  explanation:
    'Эхний хэсэгт галт тэрэг 10 минутын дараа хөдлөхийг, дараагийн хэсэгт тасалбар алга болсныг хэлдэг. Эцэст нь тэд тасалбарыг олж, амжиж суудаг.',
};
