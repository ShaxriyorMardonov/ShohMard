// Testni muddatidan oldin yakunlash va vaqtini o'zgartirish. Kalit — o'zbekcha (lotin) matn.
const ru: Record<string, string> = {
  "Diqqat: hozir {n} ta talaba testni ishlayapti.": "Внимание: сейчас тест проходят студентов: {n}.",
  "va yana {n} ta": "и ещё {n}",
  "Testni hozir yakunlash": "Завершить тест сейчас",
  "Testni muddatidan oldin yakunlash": "Досрочное завершение теста",
  "Test darhol yopiladi va talabalar uni boshqa boshlay olmaydi.": "Тест будет сразу закрыт, и студенты больше не смогут его начать.",
  "Hozir test ishlayotganlar tekshirilmoqda...": "Проверяем, кто сейчас проходит тест...",
  "Yakunlasangiz, ularning shu paytgacha belgilagan javoblari avtomatik topshiriladi.": "При завершении их отмеченные к этому моменту ответы будут сданы автоматически.",
  "Hozir testni ishlayotgan talaba yo'q.": "Сейчас никто не проходит тест.",
  "Test muddatidan oldin yakunlandi. Javoblaringiz avtomatik topshirildi.": "Тест завершён досрочно. Ваши ответы сданы автоматически.",
  "Diqqat: test vaqti o'zgartirildi. Taymer yangi vaqtga moslandi.": "Внимание: время теста изменено. Таймер обновлён.",
  "Test vaqtini o'zgartirish": "Изменение времени теста",
  "Yangi vaqt testni hozir ishlayotgan talabalarga ham darhol qo'llanadi.": "Новое время сразу применится и к студентам, которые сейчас проходят тест.",
  "Ularning taymeri yangi vaqtga moslanadi va ekranida ogohlantirish chiqadi. Agar vaqt qisqarib, tugab qolsa, javoblari avtomatik topshiriladi.": "Их таймер обновится, и на экране появится предупреждение. Если время сократится и истечёт, ответы будут сданы автоматически.",
  "Baribir o'zgartirish": "Всё равно изменить",
  "Test allaqachon yakunlangan": "Тест уже завершён",
};

const en: Record<string, string> = {
  "Diqqat: hozir {n} ta talaba testni ishlayapti.": "Warning: {n} student(s) are taking the test right now.",
  "va yana {n} ta": "and {n} more",
  "Testni hozir yakunlash": "End test now",
  "Testni muddatidan oldin yakunlash": "End the test early",
  "Test darhol yopiladi va talabalar uni boshqa boshlay olmaydi.": "The test closes immediately and students can no longer start it.",
  "Hozir test ishlayotganlar tekshirilmoqda...": "Checking who is taking the test right now...",
  "Yakunlasangiz, ularning shu paytgacha belgilagan javoblari avtomatik topshiriladi.": "If you end it, the answers they have marked so far will be submitted automatically.",
  "Hozir testni ishlayotgan talaba yo'q.": "Nobody is taking the test right now.",
  "Test muddatidan oldin yakunlandi. Javoblaringiz avtomatik topshirildi.": "The test was ended early. Your answers were submitted automatically.",
  "Diqqat: test vaqti o'zgartirildi. Taymer yangi vaqtga moslandi.": "Attention: the test time was changed. The timer has been updated.",
  "Test vaqtini o'zgartirish": "Change test time",
  "Yangi vaqt testni hozir ishlayotgan talabalarga ham darhol qo'llanadi.": "The new time also applies immediately to students taking the test now.",
  "Ularning taymeri yangi vaqtga moslanadi va ekranida ogohlantirish chiqadi. Agar vaqt qisqarib, tugab qolsa, javoblari avtomatik topshiriladi.": "Their timer will update and a notice will appear on their screen. If the time is shortened and runs out, their answers are submitted automatically.",
  "Baribir o'zgartirish": "Change anyway",
  "Test allaqachon yakunlangan": "The test has already ended",
};

const dict = { ru, en };
export default dict;
