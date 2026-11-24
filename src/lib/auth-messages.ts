const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Имэйл, хэрэглэгчийн нэр эсвэл нууц үг буруу байна.',
  INVALID_EMAIL: 'Имэйл хаягаа зөв оруулна уу.',
  INVALID_USERNAME: 'Нэр 3–24 үсэг, тоо, доогуур зураас эсвэл зураас байж болно.',
  WEAK_PASSWORD: 'Нууц үг хамгийн багадаа 8 тэмдэгттэй байна.',
  EMAIL_TAKEN: 'Энэ имэйлээр бүртгэл үүссэн байна. Нэвтэрч ороорой.',
  USERNAME_TAKEN: 'Энэ хэрэглэгчийн нэр ашиглагдаж байна. Өөр нэр сонгоорой.',
  RATE_LIMITED: 'Олон удаа оролдлоо. Түр хүлээгээд дахин оролдоорой.',
  UNAUTHENTICATED: 'Дахин нэвтэрч орно уу.',
};
export function authMessage(code: string): string {
  return messages[code] ?? 'Холбогдож чадсангүй. Түр хүлээгээд дахин оролдоорой.';
}
