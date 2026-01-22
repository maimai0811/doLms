const puppeteer = require('puppeteer');
const config = require('./config');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // true để ẩn browser
  const page = await browser.newPage();
  await page.goto(config.loginUrl, { waitUntil: 'networkidle2' });

  // ✅ Đăng nhập
  await page.type(config.selectors.usernameInput, config.username);
  await page.type(config.selectors.passwordInput, config.password);
  await Promise.all([
    page.click(config.selectors.loginButton),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  console.log('✅ Đăng nhập thành công');

  // ✅ Truy cập bài kiểm tra
  await page.goto(config.testUrl, { waitUntil: 'networkidle2' });

  // ✅ Auto làm bài: chọn đáp án đầu tiên mỗi câu
  const questions = await page.$$(config.selectors.questionContainer);

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const options = await question.$$(config.selectors.option);
    if (options.length > 0) {
      await options[0].click(); // chọn đáp án đầu tiên
    }

    // Nếu có nút "Next", click để sang câu tiếp theo
    const nextButton = await page.$(config.selectors.nextButton);
    if (nextButton) {
      await nextButton.click();
      await page.waitForTimeout(1000); // chờ 1s để chuyển câu
    }
  }

  // ✅ Gửi bài
  const submitButton = await page.$(config.selectors.submitButton);
  if (submitButton) {
    await submitButton.click();
    console.log('✅ Đã nộp bài');
  }

  // Đóng trình duyệt
  await browser.close();
})();
