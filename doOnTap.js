const serviceDbModule = require('./serviceDb');

const doOnTap = async (page, isPointPass, hasDapAn, maxRandom, mon, currentChuong) => {
    let isPass = false;
    let isDoing = false;
    let demLanLoi = 0;

    while (!isPass) {
        const completeInfoEl = await page.$('.completion-info');
        const completeText = completeInfoEl
            ? await page.evaluate(el => el.innerText, completeInfoEl)
            : "";

        if (completeText.includes("Cần làm:")) {
            const btnAttemptQuiz = await page.$('button[id^="single_button"]');
            // if (btnAttemptQuiz) {
            //     await Promise.all([
            //         page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
            //         btnAttemptQuiz.click()
            //     ]);

            //     // await btnAttemptQuiz.click();
            // }

            let activePage = page;

            if (btnAttemptQuiz) {

                const newPage = await clickAndSwitchPage(
                        activePage,
                        activePage.browser(),
                        btnAttemptQuiz
                    );

                if (newPage) {
                        await newPage.bringToFront();
                        await newPage.waitForLoadState?.('load').catch(() => { });
                        activePage = newPage;
                    }

            }

            let isConfirmStart = false;
            const startBtn = await activePage.$('#id_submitbutton');

            if (startBtn) {
                isConfirmStart = true;

                const newPageAfterConfirm = await clickAndSwitchPage(
                    activePage,
                    activePage.browser(),
                    startBtn
                );

                if (newPageAfterConfirm) {
                    await newPageAfterConfirm.bringToFront();
                    await newPageAfterConfirm.waitForLoadState?.('load').catch(() => { });
                    activePage = newPageAfterConfirm;
                }
            }

            if (isConfirmStart) {
                const finalStartBtn = await activePage.waitForSelector(
                    '#id_submitbutton',
                    { timeout: 5000 }
                ).catch(() => null);

                if (finalStartBtn) {
                    console.log('');

                    const finalPage = await clickAndSwitchPage(
                        activePage,
                        activePage.browser(),
                        finalStartBtn
                    );

                    if (finalPage) {
                        await finalPage.bringToFront();
                        await finalPage.waitForLoadState?.('load').catch(() => { });
                        activePage = finalPage;
                    }
                }
            }


            await new Promise(resolve => setTimeout(resolve, 3000));

            const listQuestion = await activePage.$$('div[id^="question-"]');
            for (const question of listQuestion) {
                const listAnswer = await question.$$('div.answer input[type="radio"]');
                if (!listAnswer.length) continue;
                const randomIndex = Math.floor(Math.random() * listAnswer.length);
                const choice = listAnswer[randomIndex];
                await choice.evaluate(el => el.scrollIntoView({ behavior: 'smooth' }));
                await choice.click();
            }

            const btnHoanThanh = await activePage.$('input[id="mod_quiz-next-nav"]');
            if (btnHoanThanh) await btnHoanThanh.click();
            await new Promise(resolve => setTimeout(resolve, 3000));

            const allSubmitButtons = await activePage.$$('button[id^="single_button"]');
            for (const btn of allSubmitButtons) {
                const text = await activePage.evaluate(el => el.innerText.toLowerCase().trim(), btn);
                if (text === "nộp bài và kết thúc") {
                    // await Promise.all([
                    //     // page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                    //     btn.click()
                    // ]);
                    await btn.click();
                    break;
                }
            }
            await activePage.waitForSelector('button[data-action="save"]', {
                visible: true,
                timeout: 0
            });
            const btnConfirm = await activePage.$('button[data-action="save"]');
            if (btnConfirm) {
                await Promise.all([
                    activePage.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                    btnConfirm.click()
                ]);
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
            // await page.waitForSelector('div[id^="question-"]', { timeout: 10000 });
            const listQuestion2 = await activePage.$$('div[id^="question-"]');
            for (const question of listQuestion2) {
                const className = await question.evaluate(el => el.className);
                const cauHoi = await getNoiDungCauHoi(question);

                if (hasDapAn) {
                    const rightAnswer = await question.$$('.outcome .rightanswer');
                    if (rightAnswer.length > 0) {
                        const dapAnDung = await getNoiDungDapAnDungResponse(question);
                        await serviceDbModule.saveDapAn(cauHoi, dapAnDung, "", mon, currentChuong);
                        continue;
                    }
                }

                if (className.includes('correct') && !className.includes('incorrect')) {
                    const dapAnDung = await getNoiDungDapAnDung(question);
                    await serviceDbModule.saveDapAn(cauHoi, dapAnDung, "", mon, currentChuong);
                } else if (className.includes('incorrect')) {
                    const dapAnSai = await getNoiDungDapAnSai(question);
                    await serviceDbModule.saveDapAn(cauHoi, "", dapAnSai, mon, currentChuong);
                }
            }

            const stopLinks = await activePage.$$('.submitbtns a');
            for (const a of stopLinks) {
                const text = await activePage.evaluate(el => el.innerText.toLowerCase().trim(), a);
                if (text === "dừng xem lại") {
                    await Promise.all([
                        activePage.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                        a.click()
                    ]);
                    break;
                }
            }

            if (activePage !== page) {
                await activePage.close();
                await page.bringToFront();
                activePage = page;
                await page.reload({
                    waitUntil: 'networkidle0', // hoặc 'load'
                    timeout: 0
                });
                // await page.waitForLoadState?.('load')
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            // await page.reload({ waitUntil: 'load' });
            // await page.reload({ waitUntil: 'load', timeout: 0 }); // timeout 30 giây
            demLanLoi++;

        } else if (completeText.includes("Lỗi:") || isDoing) {
            let activePage = page;
            const allButtons = await page.$$('button[id^="single_button"]');
            for (const btn of allButtons) {
                const text = await page.evaluate(el => el.innerText.toLowerCase().trim(), btn);
                if (text === "thực hiện lại đề thi" || text === "tiếp tục làm bài") {
                    // await Promise.all([
                    //     page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                    //     btn.click()
                    // ]);
                    // await btn.click();
                    const newPage = await clickAndSwitchPage(
                        activePage,
                        activePage.browser(),
                        btn
                    );

                    if (newPage) {
                        await newPage.bringToFront();
                        await newPage.waitForLoadState?.('load').catch(() => { });
                        activePage = newPage;
                    }
                    break;
                }
            }

            let isConfirmStart = false;
            const startBtn = await activePage.$('#id_submitbutton');

            if (startBtn) {
                isConfirmStart = true;

                const newPageAfterConfirm = await clickAndSwitchPage(
                    activePage,
                    activePage.browser(),
                    startBtn
                );

                if (newPageAfterConfirm) {
                    await newPageAfterConfirm.bringToFront();
                    await newPageAfterConfirm.waitForLoadState?.('load').catch(() => { });
                    activePage = newPageAfterConfirm;
                }
            }

            if (isConfirmStart) {
                const finalStartBtn = await activePage.waitForSelector(
                    '#id_submitbutton',
                    { timeout: 5000 }
                ).catch(() => null);

                if (finalStartBtn) {
                    console.log('');

                    const finalPage = await clickAndSwitchPage(
                        activePage,
                        activePage.browser(),
                        finalStartBtn
                    );

                    if (finalPage) {
                        await finalPage.bringToFront();
                        await finalPage.waitForLoadState?.('load').catch(() => { });
                        activePage = finalPage;
                    }
                }
            }



            await new Promise(resolve => setTimeout(resolve, 3000));

            const listQuestion = await activePage.$$('div[id^="question-"]');
            for (const question of listQuestion) {
                if (demLanLoi >= maxRandom) {
                    await choiceAnswerTheoDb(question, mon, currentChuong);
                } else {
                    const listAnswer = await question.$$('div.answer input[type="radio"]');
                    if (!listAnswer.length) continue;
                    const randomIndex = Math.floor(Math.random() * listAnswer.length);
                    const choice = listAnswer[randomIndex];
                    await choice.evaluate(el => el.scrollIntoView({ behavior: 'smooth' }));
                    await choice.click();
                }
            }

            const btnHoanThanh = await activePage.$('input[id="mod_quiz-next-nav"]');
            if (btnHoanThanh) await btnHoanThanh.click();
            await new Promise(resolve => setTimeout(resolve, 3000));

            let needConfirm = true;
            const allSubmitButtons = await activePage.$$('button[id^="single_button"]');
            for (const btn of allSubmitButtons) {
                const text = await activePage.evaluate(el => el.innerText.toLowerCase().trim(), btn);

                if (text === "nộp bài và kết thúc") {
                    const hasDataActionSave = await activePage.evaluate(el => el.getAttribute("data-action") === "save", btn);

                    if (hasDataActionSave) {
                        needConfirm = false;
                        await Promise.all([
                            activePage.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                            btn.click()
                        ]);
                        break;
                    } else {
                        await btn.click();
                        break;
                    }

                }
            }

            if (needConfirm) {
                await activePage.waitForSelector('button[data-action="save"]', {
                    visible: true,
                    timeout: 0
                });
                const btnConfirm = await activePage.$('button[data-action="save"]');
                if (btnConfirm) {
                    await Promise.all([
                        activePage.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                        btnConfirm.click()
                    ]);
                }
            }


            await new Promise(resolve => setTimeout(resolve, 3000));
            // await page.waitForSelector('div[id^="question-"]', { timeout: 0 });
            const listQuestion2 = await activePage.$$('div[id^="question-"]');
            for (const question of listQuestion2) {
                const className = await question.evaluate(el => el.className);
                const cauHoi = await getNoiDungCauHoi(question);

                if (hasDapAn) {
                    const rightAnswer = await question.$$('.outcome .rightanswer');
                    if (rightAnswer.length > 0) {
                        const dapAnDung = await getNoiDungDapAnDungResponse(question);
                        await serviceDbModule.saveDapAn(cauHoi, dapAnDung, "", mon, currentChuong);
                        continue;
                    }
                }

                if (className.includes('correct') && !className.includes('incorrect')) {
                    const dapAnDung = await getNoiDungDapAnDung(question);
                    await serviceDbModule.saveDapAn(cauHoi, dapAnDung, "", mon, currentChuong);
                } else if (className.includes('incorrect')) {
                    const dapAnSai = await getNoiDungDapAnSai(question);
                    await serviceDbModule.saveDapAn(cauHoi, "", dapAnSai, mon, currentChuong);
                }
            }

            const stopLinks = await activePage.$$('.submitbtns a');
            for (const a of stopLinks) {
                const text = await activePage.evaluate(el => el.innerText.toLowerCase().trim(), a);
                if (text === "dừng xem lại") {
                    await Promise.all([
                        activePage.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                        a.click()
                    ]);
                    break;
                }
            }

            if (activePage !== page) {
                await activePage.close();
                await page.bringToFront();
                activePage = page;
                await page.reload({
                    waitUntil: 'networkidle0', // hoặc 'load'
                    timeout: 0
                });
                // await page.waitForLoadState?.('load')
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            // await page.reload({ waitUntil: 'load' });
            // await page.reload({ waitUntil: 'load', timeout: 0 }); // timeout 30 giây

            demLanLoi++;
            isDoing = false;
        } else {
            // const allButtons = await page.$$('button[id^="single_button"]');
            // for (const btn of allButtons) {
            //     const text = await page.evaluate(el => el.innerText.toLowerCase().trim(), btn);
            //     if (text === "tiếp tục làm bài") {
            //         isDoing = true;
            //         // await btn.click();
            //         await Promise.all([
            //             page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
            //             btn.click()
            //         ]);
            //         break;
            //     }
            // }

            // if (!isDoing) {
            //     const feedback = await page.$('#feedback');
            //     const maxPointText = feedback
            //         ? await page.evaluate(el => el.innerText, feedback)
            //         : "";

            //     if (isPointPass !== 10 || maxPointText.toLowerCase().includes("10,00 / 10,00")) {
            //         isPass = true;
            //     } else {
            //         isDoing = true;
            //     }
            // }



            let activePage = page;

            const allButtons = await activePage.$$('button[id^="single_button"]');
            for (const btn of allButtons) {
                const text = await activePage.evaluate(el => el.innerText.toLowerCase().trim(), btn);
                if (text === "tiếp tục làm bài") {
                    isDoing = true;

                    const newPage = await clickAndSwitchPage(
                        activePage,
                        activePage.browser(),
                        btn
                    );

                    if (newPage) {
                        await newPage.bringToFront();
                        await newPage.waitForLoadState?.('load').catch(() => { });
                        activePage = newPage; // 🔥 CHUYỂN CONTEXT
                        await page.waitForLoadState?.('load')
                    }

                    if (activePage !== page) {
                        await activePage.close();
                        await page.bringToFront();
                        activePage = page;
                    }

                    break;
                }
            }

            // if (!isDoing) {
            //     const feedback = await activePage.$('#feedback');
                
            //     const maxPointText = feedback
            //         ? await activePage.evaluate(el => el.innerText, feedback)
            //         : "";

            //     if (isPointPass !== 10 || maxPointText.toLowerCase().includes("10,00 / 10,00")) {
            //         isPass = true;
            //     } else {
            //         isDoing = true;
            //     }
            // }

            if (!isDoing) {
                const feedback = await activePage.$('#feedback');

                let maxPointText = "";

                if (feedback) {
                    maxPointText = await activePage.evaluate(el => el.innerText, feedback);
                } else {
                    // Không có feedback → tìm trong td.cell
                    const isFullPoint = await activePage.$$eval(
                        'td.cell',
                        tds => tds.some(td =>
                            td.innerText
                                .replace(/\s+/g, ' ')
                                .includes('10,00 trên 10,00') &&
                            td.innerText.includes('100')
                        )
                    );

                    if (isFullPoint) {
                        isPass = true;
                        break;
                    }
                }

                if (isPointPass !== 10 || maxPointText.toLowerCase().includes("10,00 / 10,00")) {
                    isPass = true;
                } else {
                    isDoing = true;
                }
            }


        }

        // if (activePage !== page) {
        //     await activePage.close();
        //     await page.bringToFront();
        //     activePage = page;
        // }
    }
};

async function clickAndSwitchPage(page, browser, element, timeout = 5000) {
    const newPagePromise = new Promise(resolve => {
        const handler = async target => {
            if (target.type() === 'page') {
                browser.off('targetcreated', handler);
                resolve(target.page());
            }
        };
        browser.on('targetcreated', handler);
    });

    await element.click();

    const newPage = await Promise.race([
        newPagePromise,
        page.waitForNavigation({ waitUntil: 'load', timeout }).then(() => null).catch(() => null)
    ]);

    return newPage; // null = vẫn tab cũ
}

function normalizeMoodleImageUrl(url) {
    if (!url) return url;

    const pattern =
        /(https:\/\/lms\.pttc1\.edu\.vn\/pluginfile\.php\/\d+\/question\/questiontext\/)(\d+)\/(\d+)(\/\d+\/image\d+\.(png|jpg|jpeg))/i;

    if (!pattern.test(url)) return url;

    return url.replace(pattern, '$1{idBai}/{idCau}$4');
}





async function getNoiDungCauHoi(questionElement) {
    let cauHoi = '';

    // Lấy tất cả <p> trong .qtext
    const listP = await questionElement.$$('.qtext > p');

    for (const pcell of listP) {
        const spans = await pcell.$$('span');

        // Nếu không có <span> nào trong <p>
        if (spans.length === 0) {
            // Lấy nội dung văn bản
            const text = await pcell.evaluate(el => el.textContent.trim());
            cauHoi += ' ' + text;

            // Xử lý các <img> trong <p>
            const imgElements = await pcell.$$('img');
            for (const img of imgElements) {
                const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                if (mathml) {
                    cauHoi += ' ' + mathml;
                } else {
                    const src = await img.evaluate(el => el.getAttribute('src'));
                    if (src) {
                        cauHoi += ' ' + src;
                    }
                }
            }

        } else {
            // Có <span> bên trong <p>
            for (const dongCauHoi of spans) {
                const text = await dongCauHoi.evaluate(el => el.textContent.trim());
                cauHoi += ' ' + text;

                const imgElements = await dongCauHoi.$$('img');
                for (const img of imgElements) {
                    const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                    if (mathml) {
                        cauHoi += ' ' + mathml;
                    } else {
                        const src = await img.evaluate(el => el.getAttribute('src'));
                        if (src) {
                            cauHoi += ' ' + src;
                        }
                    }
                }
            }
        }
    }

    cauHoi = cauHoi.trim();
    cauHoi = normalizeMoodleImageUrl(cauHoi)
    return cauHoi;
}

async function getNoiDungDapAnDung(questionElement) {
    let dapAn = '';

    // Tìm tất cả <p> nằm trong các phần tử có class "correct" trong .answer
    const listP = await questionElement.$$('.answer .correct p');

    for (const pcell of listP) {
        const spans = await pcell.$$('span');

        // Nếu <p> không có <span> con
        if (spans.length === 0) {
            const text = await pcell.evaluate(el => el.textContent.trim());
            dapAn += ' ' + text;

            const imgElements = await pcell.$$('img');
            for (const img of imgElements) {
                const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                if (mathml) {
                    dapAn += ' ' + mathml;
                } else {
                    const src = await img.evaluate(el => el.getAttribute('src'));
                    if (src) {
                        dapAn += ' ' + src;
                    }
                }
            }

        } else {
            for (const dongDapAn of spans) {
                const text = await dongDapAn.evaluate(el => el.textContent.trim());
                dapAn += ' ' + text;

                const imgElements = await dongDapAn.$$('img');
                for (const img of imgElements) {
                    const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                    if (mathml) {
                        dapAn += ' ' + mathml;
                    } else {
                        const src = await img.evaluate(el => el.getAttribute('src'));
                        if (src) {
                            dapAn += ' ' + src;
                        }
                    }
                }
            }
        }
    }

    return dapAn.trim();
}

async function getNoiDungDapAnDungResponse(questionElement) {
    let dapAn = '';

    const rightAnswerEl = await questionElement.$('.outcome .rightanswer');
    if (!rightAnswerEl) return '';

    const listP = await rightAnswerEl.$$('p');

    // ✅ TH2: không có <p>
    if (listP.length === 0) {
        const fullText = await rightAnswerEl.evaluate(el =>
            el.textContent.replace('Câu trả lời đúng là:', '').trim()
        );
        return fullText;
    }

    // ✅ TH1: có <p>
    for (const pcell of listP) {
        const spans = await pcell.$$('span');

        if (spans.length === 0) {
            const text = await pcell.evaluate(el => el.textContent.trim());
            dapAn += ' ' + text;
        } else {
            for (const dongDapAn of spans) {
                const text = await dongDapAn.evaluate(el => el.textContent.trim());
                dapAn += ' ' + text;
            }
        }

        // xử lý img chung cho cả 2 nhánh
        const imgElements = await pcell.$$('img');
        for (const img of imgElements) {
            const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
            if (mathml) {
                dapAn += ' ' + mathml;
            } else {
                const src = await img.evaluate(el => el.getAttribute('src'));
                if (src) dapAn += ' ' + src;
            }
        }
    }

    return dapAn.trim();
}


// áp dụng version cũ. k dùng dc vì phát sinh TH đáp án đúng lại nằm luôn ở class .rightanswer
// ví dụ <div class="rightanswer">Câu trả lời đúng là: Adding mushroom</div>
async function getNoiDungDapAnDungResponseV1(questionElement) {
    let dapAn = '';

    // Tìm tất cả <p> trong .outcome .rightanswer
    const listP = await questionElement.$$('.outcome .rightanswer p');

    for (const pcell of listP) {
        const spans = await pcell.$$('span');

        // Nếu không có <span> nào
        if (spans.length === 0) {
            const text = await pcell.evaluate(el => el.textContent.trim());
            dapAn += ' ' + text;

            const imgElements = await pcell.$$('img');
            for (const img of imgElements) {
                const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                if (mathml) {
                    dapAn += ' ' + mathml;
                } else {
                    const src = await img.evaluate(el => el.getAttribute('src'));
                    if (src) {
                        dapAn += ' ' + src;
                    }
                }
            }

        } else {
            // Có <span> trong <p>
            for (const dongDapAn of spans) {
                const text = await dongDapAn.evaluate(el => el.textContent.trim());
                dapAn += ' ' + text;

                const imgElements = await dongDapAn.$$('img');
                for (const img of imgElements) {
                    const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                    if (mathml) {
                        dapAn += ' ' + mathml;
                    } else {
                        const src = await img.evaluate(el => el.getAttribute('src'));
                        if (src) {
                            dapAn += ' ' + src;
                        }
                    }
                }
            }
        }
    }

    return dapAn.trim();
}

async function getNoiDungDapAnSai(questionElement) {
    let dapAn = '';

    // Tìm tất cả <p> nằm trong .answer .incorrect
    const listP = await questionElement.$$('.answer .incorrect p');

    for (const pcell of listP) {
        const spans = await pcell.$$('span');

        // Nếu <p> không chứa <span>
        if (spans.length === 0) {
            const text = await pcell.evaluate(el => el.textContent.trim());
            dapAn += ' ' + text;

            const imgElements = await pcell.$$('img');
            for (const img of imgElements) {
                const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                if (mathml) {
                    dapAn += ' ' + mathml;
                } else {
                    const src = await img.evaluate(el => el.getAttribute('src'));
                    if (src) {
                        dapAn += ' ' + src;
                    }
                }
            }

        } else {
            // Nếu có <span> bên trong <p>
            for (const dongDapAn of spans) {
                const text = await dongDapAn.evaluate(el => el.textContent.trim());
                dapAn += ' ' + text;

                const imgElements = await dongDapAn.$$('img');
                for (const img of imgElements) {
                    const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                    if (mathml) {
                        dapAn += ' ' + mathml;
                    } else {
                        const src = await img.evaluate(el => el.getAttribute('src'));
                        if (src) {
                            dapAn += ' ' + src;
                        }
                    }
                }
            }
        }
    }

    return dapAn.trim();
}

async function getNoiDungDapAn(questionElement) {
    let dapAn = '';

    // Tìm tất cả <p> trong các phần tử có id chứa "answer"
    const listP = await questionElement.$$('[id*="answer"] p');

    for (const pcell of listP) {
        const spans = await pcell.$$('span');

        if (spans.length === 0) {
            const text = await pcell.evaluate(el => el.textContent.trim());
            dapAn += ' ' + text;

            const imgElements = await pcell.$$('img');
            for (const img of imgElements) {
                const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                if (mathml) {
                    dapAn += ' ' + mathml;
                } else {
                    const src = await img.evaluate(el => el.getAttribute('src'));
                    if (src) {
                        dapAn += ' ' + src;
                    }
                }
            }

        } else {
            for (const dongDapAn of spans) {
                const text = await dongDapAn.evaluate(el => el.textContent.trim());
                dapAn += ' ' + text;

                const imgElements = await dongDapAn.$$('img');
                for (const img of imgElements) {
                    const mathml = await img.evaluate(el => el.getAttribute('data-mathml'));
                    if (mathml) {
                        dapAn += ' ' + mathml;
                    } else {
                        const src = await img.evaluate(el => el.getAttribute('src'));
                        if (src) {
                            dapAn += ' ' + src;
                        }
                    }
                }
            }
        }
    }

    return dapAn.trim();
}



// async function getNoiDungCauHoi(questionElement) {
//     let cauHoi = '';

//     const list_p = await questionElement.$$('.qtext > p');  // CSS selector thay thế cho XPath: .//div[@class="qtext"]/p

//     for (const pcell of list_p) {
//         const list_dong_cau_hoi = await pcell.$$('span');

//         if (list_dong_cau_hoi.length === 0) {
//             // Lấy text từ thẻ <p>
//             const text = await (await pcell.getProperty('textContent')).jsonValue();
//             cauHoi += ' ' + text.trim();

//             // Tìm ảnh trong <p>
//             const imgElements = await pcell.$$('img');
//             for (const img of imgElements) {
//                 const mathml = await (await img.getProperty('dataset')).jsonValue();
//                 if (mathml && mathml.mathml) {
//                     cauHoi += ' ' + mathml.mathml;
//                 } else {
//                     const src = await (await img.getProperty('src')).jsonValue();
//                     cauHoi += ' ' + src;
//                 }
//             }

//         } else {
//             for (const dong_cau_hoi of list_dong_cau_hoi) {
//                 const text = await (await dong_cau_hoi.getProperty('textContent')).jsonValue();
//                 cauHoi += ' ' + text.trim();

//                 const imgElements = await dong_cau_hoi.$$('img');
//                 for (const img of imgElements) {
//                     const mathml = await (await img.getProperty('dataset')).jsonValue();
//                     if (mathml && mathml.mathml) {
//                         cauHoi += ' ' + mathml.mathml;
//                     } else {
//                         const src = await (await img.getProperty('src')).jsonValue();
//                         cauHoi += ' ' + src;
//                     }
//                 }
//             }
//         }
//     }

//     return cauHoi.trim();
// }

// async function getNoiDungDapAnDung(questionElement) {
//     let dapAn = '';

//     // Lấy tất cả các phần tử <p> trong câu trả lời đúng
//     const listP = await questionElement.$$('.answer .correct p');

//     for (const pcell of listP) {
//         const listDongDapAn = await pcell.$$('span');

//         if (listDongDapAn.length === 0) {
//             const text = await (await pcell.getProperty('textContent')).jsonValue();
//             dapAn += ' ' + text.trim();

//             const imgElements = await pcell.$$('img');
//             for (const img of imgElements) {
//                 const mathml = await (await img.getProperty('dataset')).jsonValue();
//                 if (mathml && mathml.mathml) {
//                     dapAn += ' ' + mathml.mathml;
//                 } else {
//                     const src = await (await img.getProperty('src')).jsonValue();
//                     dapAn += ' ' + src;
//                 }
//             }
//         } else {
//             for (const dongDapAn of listDongDapAn) {
//                 const text = await (await dongDapAn.getProperty('textContent')).jsonValue();
//                 dapAn += ' ' + text.trim();

//                 const imgElements = await dongDapAn.$$('img');
//                 for (const img of imgElements) {
//                     const mathml = await (await img.getProperty('dataset')).jsonValue();
//                     if (mathml && mathml.mathml) {
//                         dapAn += ' ' + mathml.mathml;
//                     } else {
//                         const src = await (await img.getProperty('src')).jsonValue();
//                         dapAn += ' ' + src;
//                     }
//                 }
//             }
//         }
//     }

//     return dapAn.trim();
// }

// async function getNoiDungDapAnSai(questionElement) {
//     let dapAn = '';

//     // Tìm tất cả các thẻ <p> trong đáp án sai
//     const listP = await questionElement.$$('.answer .incorrect p');

//     for (const pcell of listP) {
//         const listDongDapAn = await pcell.$$('span');

//         if (listDongDapAn.length === 0) {
//             const text = await (await pcell.getProperty('textContent')).jsonValue();
//             dapAn += ' ' + text.trim();

//             const imgElements = await pcell.$$('img');
//             for (const img of imgElements) {
//                 const dataset = await (await img.getProperty('dataset')).jsonValue();
//                 if (dataset && dataset.mathml) {
//                     dapAn += ' ' + dataset.mathml;
//                 } else {
//                     const src = await (await img.getProperty('src')).jsonValue();
//                     dapAn += ' ' + src;
//                 }
//             }
//         } else {
//             for (const dongDapAn of listDongDapAn) {
//                 const text = await (await dongDapAn.getProperty('textContent')).jsonValue();
//                 dapAn += ' ' + text.trim();

//                 const imgElements = await dongDapAn.$$('img');
//                 for (const img of imgElements) {
//                     const dataset = await (await img.getProperty('dataset')).jsonValue();
//                     if (dataset && dataset.mathml) {
//                         dapAn += ' ' + dataset.mathml;
//                     } else {
//                         const src = await (await img.getProperty('src')).jsonValue();
//                         dapAn += ' ' + src;
//                     }
//                 }
//             }
//         }
//     }

//     return dapAn.trim();
// }

// async function getNoiDungDapAnDungResponse(questionElement) {
//     let dapAn = '';

//     // Tìm tất cả các thẻ <p> trong .outcome .rightanswer
//     const listP = await questionElement.$$('.outcome .rightanswer p');

//     for (const pcell of listP) {
//         const listDongDapAn = await pcell.$$('span');

//         if (listDongDapAn.length === 0) {
//             const text = await (await pcell.getProperty('textContent')).jsonValue();
//             dapAn += ' ' + text.trim();

//             const imgElements = await pcell.$$('img');
//             for (const img of imgElements) {
//                 const dataset = await (await img.getProperty('dataset')).jsonValue();
//                 if (dataset && dataset.mathml) {
//                     dapAn += ' ' + dataset.mathml;
//                 } else {
//                     const src = await (await img.getProperty('src')).jsonValue();
//                     dapAn += ' ' + src;
//                 }
//             }
//         } else {
//             for (const dongDapAn of listDongDapAn) {
//                 const text = await (await dongDapAn.getProperty('textContent')).jsonValue();
//                 dapAn += ' ' + text.trim();

//                 const imgElements = await dongDapAn.$$('img');
//                 for (const img of imgElements) {
//                     const dataset = await (await img.getProperty('dataset')).jsonValue();
//                     if (dataset && dataset.mathml) {
//                         dapAn += ' ' + dataset.mathml;
//                     } else {
//                         const src = await (await img.getProperty('src')).jsonValue();
//                         dapAn += ' ' + src;
//                     }
//                 }
//             }
//         }
//     }

//     return dapAn.trim();
// }

// async function getNoiDungDapAn(questionElement) {
//     let dapAn = '';

//     // Tìm tất cả thẻ <p> trong các div có id chứa 'answer'
//     const listP = await questionElement.$$('div[id*="answer"] p');

//     for (const pcell of listP) {
//         const spans = await pcell.$$('span');

//         if (spans.length === 0) {
//             const text = await (await pcell.getProperty('textContent')).jsonValue();
//             dapAn += ' ' + text.trim();

//             const imgElements = await pcell.$$('img');
//             for (const img of imgElements) {
//                 const dataset = await (await img.getProperty('dataset')).jsonValue();
//                 if (dataset && dataset.mathml) {
//                     dapAn += ' ' + dataset.mathml;
//                 } else {
//                     const src = await (await img.getProperty('src')).jsonValue();
//                     dapAn += ' ' + src;
//                 }
//             }
//         } else {
//             for (const span of spans) {
//                 const text = await (await span.getProperty('textContent')).jsonValue();
//                 dapAn += ' ' + text.trim();

//                 const imgElements = await span.$$('img');
//                 for (const img of imgElements) {
//                     const dataset = await (await img.getProperty('dataset')).jsonValue();
//                     if (dataset && dataset.mathml) {
//                         dapAn += ' ' + dataset.mathml;
//                     } else {
//                         const src = await (await img.getProperty('src')).jsonValue();
//                         dapAn += ' ' + src;
//                     }
//                 }
//             }
//         }
//     }

//     return dapAn.trim();
// }

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function choiceAnswerTheoDb(questionElement, mon, chuong) {
    const db = serviceDbModule.connectDb(mon);

    // 1. Lấy nội dung câu hỏi
    const cauHoi = await getNoiDungCauHoi(questionElement);

    // 2. Tìm trong DB
    const cauHoiTrongDb = await serviceDbModule.getQuestionInDbByQuestionName(db, mon, chuong, cauHoi);

    // Hàm chuẩn hóa chuỗi để so sánh
    const normalizeString = (str) => str.replace(/\s+/g, ' ').trim().toLowerCase();

    // 3. Nếu chưa có trong DB → chọn ngẫu nhiên
    if (!cauHoiTrongDb) {
        const listAnswer = await questionElement.$$('div.answer input[type="radio"]');
        const choice = randomChoice(listAnswer);
        if (choice) {
            await choice.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
            await choice.click();
        }
        return;
    }

    const answerDivs = await questionElement.$$('.answer > div');

    const listAnswerFromDb = typeof cauHoiTrongDb.answer === 'string' && cauHoiTrongDb.answer.trim()
        ? cauHoiTrongDb.answer.split("<<<<>>>>").map(normalizeString)
        : [];

    const listOtherFromDb = typeof cauHoiTrongDb.other === 'string' && cauHoiTrongDb.other.trim()
        ? cauHoiTrongDb.other.split("<<<<>>>>").map(normalizeString)
        : [];

    const dapAnTrongDb = normalizeString(cauHoiTrongDb.answer).toLowerCase();

    if (listAnswerFromDb.length > 0) {
        for (const item of answerDivs) {
            const dapAn = normalizeString(await getNoiDungDapAn(item)).toLowerCase();

            // áp dụng cho môn python, đáp án số, tránh trường hợp đáp án sai là 5, đáp án đúng là 15 
            if (dapAnTrongDb == dapAn) {
                const radio = await item.$('input[type="radio"]');
                if (radio) {
                    await radio.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
                    await radio.click();
                    return;
                }
            }

            // trường hợp câu hỏi giống nhau nhưng khác đáp án
            // if (listAnswerFromDb.includes(dapAn)) {
            //     const radio = await item.$('input[type="radio"]');
            //     if (radio) {
            //         await radio.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
            //         await radio.click();
            //         return;
            //     }
            // }
        }

        // Không match → chọn ngẫu nhiên
        const listAnswer = await questionElement.$$('div.answer input[type="radio"]');
        const choice = randomChoice(listAnswer);
        if (choice) {
            await choice.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
            await choice.click();
        }
        return;
    }

    if (listOtherFromDb.length > 0) {
        for (const item of answerDivs) {
            const dapAn = normalizeString(await getNoiDungDapAn(item));

            if (listOtherFromDb.includes(dapAn)) {
                continue; // bỏ qua đáp án sai
            }

            const radio = await item.$('input[type="radio"]');
            if (radio) {
                await radio.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
                await radio.click();
                return;
            }
        }

        // Nếu tất cả đều trong danh sách sai → fallback chọn ngẫu nhiên
        const listAnswer = await questionElement.$$('div.answer input[type="radio"]');
        const choice = randomChoice(listAnswer);
        if (choice) {
            await choice.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
            await choice.click();
        }
        return;
    }

    // Không có answer và cũng không có other → chọn ngẫu nhiên
    const listAnswer = await questionElement.$$('div.answer input[type="radio"]');
    const choice = randomChoice(listAnswer);
    if (choice) {
        await choice.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
        await choice.click();
    }
}


// async function choiceAnswerTheoDb(questionElement, mon, chuong) {
//     // 1. Kiểm tra có đoạn đáp án màu đỏ (sai trước đó)
//     // const redAnswers = await questionElement.$$('.answer div[id*="answer"] span[style="color:#FF0000"]');
//     // if (redAnswers.length > 0) {
//     //     const answerWrapper = await redAnswers[0].evaluateHandle(el => el.closest('div[id*="answer"]'));
//     //     const radio = await answerWrapper.$('input[type="radio"]');
//     //     await radio.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
//     //     await radio.click();
//     //     return;
//     // }

//     // 2. Kết nối DB
//     const db = serviceDbModule.connectDb(mon);

//     // 3. Lấy nội dung câu hỏi
//     const cauHoi = await getNoiDungCauHoi(questionElement); // Hàm này bạn cần định nghĩa sẵn

//     // 4. Tìm trong DB
//     const cauHoiTrongDb = await serviceDbModule.getQuestionInDbByQuestionName(db, mon, chuong, cauHoi);

//     if (!cauHoiTrongDb) {
//         // Nếu chưa có trong DB → chọn ngẫu nhiên
//         const listAnswer = await questionElement.$$('div.answer input[type="radio"]');
//         const choice = randomChoice(listAnswer);
//         await choice.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
//         await choice.click();
//     } else {
//         const answerDivs = await questionElement.$$('.answer > div');

//         if (cauHoiTrongDb.answer) {
//             for (const item of answerDivs) {
//                 const dapAn = await getNoiDungDapAn(item); // Hàm này bạn cần định nghĩa
//                 if (cauHoiTrongDb.answer.includes(dapAn)) {
//                     const radio = await item.$('input[type="radio"]');
//                     await radio.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
//                     await radio.click();
//                     return;
//                 }
//             }
//             // Nếu không match → chọn ngẫu nhiên
//             const listAnswer = await questionElement.$$('div.answer input[type="radio"]');
//             const choice = randomChoice(listAnswer);
//             await choice.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
//             await choice.click();
//         } else {
//             // Nếu không có đáp án đúng trong DB → loại các đáp án sai
//             for (const item of answerDivs) {
//                 const dapAn = await getNoiDungDapAn(item); // Hàm này bạn cần định nghĩa
//                 if (cauHoiTrongDb.other.includes(dapAn)) {
//                     continue;
//                 }
//                 const radio = await item.$('input[type="radio"]');
//                 await radio.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
//                 await radio.click();
//                 return;
//             }
//         }
//     }
// }


module.exports = {
    doOnTap
};