async function doDienDan(page, chuongContent) {
    let isPass = false;

    while (!isPass) {
        const completeInfoEl = await page.$('.completion-info');
        const completeText = await page.evaluate(el => el.textContent, completeInfoEl);

        if (
            completeText.includes("Cần làm: Bài cần đăng: 1") ||
            completeText.includes("Cần làm: Bắt đầu các cuộc thảo luận: 1")
        ) {

            // const links = await page.evaluate(() => {
            //     return Array.from(document.querySelectorAll('a.btn')).map(a => a.textContent.trim());
            // });
            // console.log(links);

            // ✅ Dùng evaluate để tìm nút qua text
            const linkAddTopicHandle = await page.evaluateHandle(() => {
                const anchors = Array.from(document.querySelectorAll('a.btn'));
                return anchors.find(a => a.textContent.toLowerCase().trim().includes("thêm một chủ đề thảo luận mới")) || null;
            });

            const linkAddTopic = linkAddTopicHandle.asElement();
            if (linkAddTopic) {
                await linkAddTopic.click();
                await new Promise(resolve => setTimeout(resolve, 3000));

                await page.type('#id_subject', chuongContent);

                // ✅ Chuyển vào iframe để nhập nội dung
                const iframeHandle = await page.$('#id_message_ifr');
                const frame = await iframeHandle.contentFrame();

                await frame.type('body', 'Chủ đề - Nội dung: ' + chuongContent);

                // ✅ Quay lại frame gốc (không cần gán lại)
                await page.mainFrame();

                await page.click('#id_submitbutton');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.warn('Không tìm thấy nút "Thêm Một Chủ Đề Thảo Luận Mới"');
            }
        } else if (completeText.includes("Cần làm: Đăng các câu trả lời: 1")) {
            await page.reload({ waitUntil: 'networkidle2' });

            const rows = await page.$$('table[class*="discussion-list"] tbody tr');

            for (const row of rows) {
                const topicCell = await row.$('th[class*="topic"]');
                // const topicText = await page.evaluate(el => el.innerText.trim(), topicCell);
                const topicLink = await topicCell.$('a');
                const topicText = await page.evaluate(el => el.getAttribute('title'), topicLink);

                if (topicText === chuongContent) {
                    const linkTopic = await row.$('th[class*="topic"] a');
                    const urlTopic = await page.evaluate(el => el.href, linkTopic);

                    // ✅ Mở tab mới
                    const newPage = await page.browser().newPage();
                    await newPage.goto(urlTopic, { waitUntil: 'networkidle2' });

                    const replyButton = await newPage.$('a[title="Phúc đáp"]');
                    await replyButton.click();

                    await newPage.waitForSelector('textarea[name="post"]');

                    const contentOld = await newPage.$('div[id^="post-content-"]');
                    const oldText = await newPage.evaluate(el => el.textContent.trim(), contentOld);

                    await newPage.type('textarea[name="post"]', "Trả lời: " + oldText);

                    const btnSubmit = await newPage.$('button[data-action="forum-inpage-submit"]');
                    await btnSubmit.click();

                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await newPage.close();
                    await page.bringToFront();

                    isPass = true;
                    break;
                }
            }
        } else {
            isPass = true;
        }
    }
}

module.exports = {
    doDienDan
};

