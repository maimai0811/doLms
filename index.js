// const express = require('express')
// const app = express()

// app.get('/', (req, res) => res.send('Hello World!'))
// app.get('/test1', (req, res) => res.status(404).send('File not found'))
// app.listen(3000, () => console.log('Server ready'))

const puppeteer = require('puppeteer');
const config = require('./config');
const doDienDanModule = require('./doDienDan');
const doOnTapModule = require('./doOnTap');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // true để ẩn browser
  // const page = await browser.newPage();
  const pages = await browser.pages();         // lấy tất cả tab hiện tại
  const page = pages[0];
  await page.goto(config.loginUrl, { waitUntil: 'networkidle2' });

  // ✅ Đăng nhập
  await page.type(config.selectors.usernameInput, config.username);
  await page.type(config.selectors.passwordInput, config.password);
  await Promise.all([
    page.click(config.selectors.loginButton),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  console.log('✅ Đăng nhập thành công');

  for (const [key, value] of Object.entries(config.listCourseUrl)) {
    if (value.isDone) continue;
    console.log(key, value);
    const pointPass = value.pointPass;
    const hasDapAn = value.hasDapAn;
    const maxRandom = value.maxRandom;
    const mon = key;
    await page.goto(value.url, { waitUntil: 'load', timeout: 60000 });

    let items = await page.$$('.section-item');
    
    for (let i = value.start; i < items.length; i++) {
      const currentChuong = i;
      const item = items[i];
      const chuongEl = await item.$('h3.course-content-item a'); // tìm link chương
      if (!chuongEl) continue;

      const chuongContent = await chuongEl.evaluate(el => el.textContent.trim());

      const links = await item.$$eval('a', (anchors) =>
        anchors
          .filter(a => a.querySelector('span.instancename'))
          .map(a => ({
            href: a.href,
            text: a.querySelector('span.instancename').textContent.trim()
          }))
      );

      for (const link of links) {
        // console.log('URL:', link.href);
        // console.log('Text:', link.text);

        let isDienDan = link.text.includes("Diễn đàn tham luận");
        let isQuestion = link.text.includes("Câu hỏi ôn tập");

        if (value.skipNormalLink && !isDienDan && !isQuestion) {
          continue;
        }

        const newPage = await page.browser().newPage();
        await newPage.goto(link.href, { waitUntil: 'load', timeout: 60000 });

        // console.log('New tab loaded:', newPage.url());

        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          if (isDienDan) {
            await doDienDanModule.doDienDan(newPage, chuongContent);
          }

          if (isQuestion) {
            await doOnTapModule.doOnTap(newPage, pointPass, hasDapAn, maxRandom, mon, currentChuong);
          }
        } catch (err) {
          console.error(`❌ Lỗi tại môn "${mon}", chương "${currentChuong}", URL: ${link.href}`);
          console.error(err.stack);
          console.error(err); // In chi tiết lỗi
        }

        // if (isDienDan) {
        //   await doDienDanModule.doDienDan(newPage, chuongContent);
        // }

        // if (isQuestion) {
        //   await doOnTapModule.doOnTap(newPage, pointPass, hasDapAn, maxRandom, mon, currentChuong);
        // }

        await newPage.close();
        if (!page.isClosed()) await page.bringToFront();

        

        // await page.bringToFront();
      }

      console.log(`✅ Hoàn thành môn "${mon}", chương "${currentChuong}"`);

      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('.section-item', { timeout: 10000 });

      items = await page.$$('.section-item');
    }
  }


  // // ✅ Truy cập bài kiểm tra
  // await page.goto(config.testUrl, { waitUntil: 'networkidle2' });

  // // ✅ Auto làm bài: chọn đáp án đầu tiên mỗi câu
  // const questions = await page.$$(config.selectors.questionContainer);

  // for (let i = 0; i < questions.length; i++) {
  //   const question = questions[i];
  //   const options = await question.$$(config.selectors.option);
  //   if (options.length > 0) {
  //     await options[0].click(); // chọn đáp án đầu tiên
  //   }

  //   // Nếu có nút "Next", click để sang câu tiếp theo
  //   const nextButton = await page.$(config.selectors.nextButton);
  //   if (nextButton) {
  //     await nextButton.click();
  //     await page.waitForTimeout(1000); // chờ 1s để chuyển câu
  //   }
  // }

  // // ✅ Gửi bài
  // const submitButton = await page.$(config.selectors.submitButton);
  // if (submitButton) {
  //   await submitButton.click();
  //   console.log('✅ Đã nộp bài');
  // }

  // Đóng trình duyệt
  await browser.close();
})();
