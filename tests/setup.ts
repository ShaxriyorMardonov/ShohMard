// Integratsion testlar alohida bazada ishlaydi: TEST_DATABASE_URL o'rnatilmagan bo'lsa, ular o'tkazib yuboriladi.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
