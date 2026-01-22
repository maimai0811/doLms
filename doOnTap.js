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
            if (btnAttemptQuiz) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                    btnAttemptQuiz.click()
                ]);

                // await btnAttemptQuiz.click();
            }
                
            await new Promise(resolve => setTimeout(resolve, 3000));

            const listQuestion = await page.$$('div[id^="question-"]');
            for (const question of listQuestion) {
                const listAnswer = await question.$$('div.answer input[type="radio"]');
                if (!listAnswer.length) continue;
                const randomIndex = Math.floor(Math.random() * listAnswer.length);
                const choice = listAnswer[randomIndex];
                await choice.evaluate(el => el.scrollIntoView({ behavior: 'smooth' }));
                await choice.click();
            }

            const btnHoanThanh = await page.$('input[id="mod_quiz-next-nav"]');
            if (btnHoanThanh) await btnHoanThanh.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const allSubmitButtons = await page.$$('button[id^="single_button"]');
            for (const btn of allSubmitButtons) {
                const text = await page.evaluate(el => el.innerText.toLowerCase().trim(), btn);
                if (text === "nộp bài và kết thúc") {
                    // await Promise.all([
                    //     // page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                    //     btn.click()
                    // ]);
                    await btn.click();
                    break;
                }
            }

            const btnConfirm = await page.$('button[data-action="save"]');
            if (btnConfirm) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'load', timeout: 0  }),
                    btnConfirm.click()
                ]);
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
            // await page.waitForSelector('div[id^="question-"]', { timeout: 10000 });
            const listQuestion2 = await page.$$('div[id^="question-"]');
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

            const stopLinks = await page.$$('.submitbtns a');
            for (const a of stopLinks) {
                const text = await page.evaluate(el => el.innerText.toLowerCase().trim(), a);
                if (text === "dừng xem lại") {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'load', timeout: 0  }),
                        a.click()
                    ]);
                    break;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            // await page.reload({ waitUntil: 'load' });
            // await page.reload({ waitUntil: 'load', timeout: 0 }); // timeout 30 giây
            demLanLoi++;

        } else if (completeText.includes("Lỗi:") || isDoing) {
            const allButtons = await page.$$('button[id^="single_button"]');
            for (const btn of allButtons) {
                const text = await page.evaluate(el => el.innerText.toLowerCase().trim(), btn);
                if (text === "thực hiện lại đề thi" || text === "tiếp tục làm bài") {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                        btn.click()
                    ]);
                    // await btn.click();
                    break;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 3000));

            const listQuestion = await page.$$('div[id^="question-"]');
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

            const btnHoanThanh = await page.$('input[id="mod_quiz-next-nav"]');
            if (btnHoanThanh) await btnHoanThanh.click();
            await new Promise(resolve => setTimeout(resolve, 3000));

            let needConfirm = true;
            const allSubmitButtons = await page.$$('button[id^="single_button"]');
            for (const btn of allSubmitButtons) {
                const text = await page.evaluate(el => el.innerText.toLowerCase().trim(), btn);

                if (text === "nộp bài và kết thúc") {
                    const hasDataActionSave = await page.evaluate(el => el.getAttribute("data-action") === "save", btn);

                    if (hasDataActionSave) {
                        needConfirm = false;
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                            btn.click()
                        ]);
                        break;
                    } else {
                        await btn.click();
                        break;
                    }

                }
                // if (text === "nộp bài và kết thúc") {
                //     // await Promise.all([
                //     //     // page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                //     //     btn.click()
                //     // ]);

                    
                //     await btn.click();
                //     break;
                // }
            }

            if (needConfirm) {
                const btnConfirm = await page.$('button[data-action="save"]');
                if (btnConfirm) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                        btnConfirm.click()
                    ]);
                }
            }


            await new Promise(resolve => setTimeout(resolve, 3000));
            // await page.waitForSelector('div[id^="question-"]', { timeout: 0 });
            const listQuestion2 = await page.$$('div[id^="question-"]');
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

            const stopLinks = await page.$$('.submitbtns a');
            for (const a of stopLinks) {
                const text = await page.evaluate(el => el.innerText.toLowerCase().trim(), a);
                if (text === "dừng xem lại") {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                        a.click()
                    ]);
                    break;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            // await page.reload({ waitUntil: 'load' });
            // await page.reload({ waitUntil: 'load', timeout: 0 }); // timeout 30 giây

            demLanLoi++;
            isDoing = false;
        } else {
            const allButtons = await page.$$('button[id^="single_button"]');
            for (const btn of allButtons) {
                const text = await page.evaluate(el => el.innerText.toLowerCase().trim(), btn);
                if (text === "tiếp tục làm bài") {
                    isDoing = true;
                    // await btn.click();
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'load', timeout: 0 }),
                        btn.click()
                    ]);
                    break;
                }
            }

            if (!isDoing) {
                const feedback = await page.$('#feedback');
                const maxPointText = feedback
                    ? await page.evaluate(el => el.innerText, feedback)
                    : "";

                if (isPointPass !== 10 || maxPointText.toLowerCase().includes("10,00 / 10,00")) {
                    isPass = true;
                } else {
                    isDoing = true;
                }
            }
        }
    }
};

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

    return cauHoi.trim();
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

    if (listAnswerFromDb.length > 0) {
        for (const item of answerDivs) {
            const dapAn = normalizeString(await getNoiDungDapAn(item));

            if (listAnswerFromDb.includes(dapAn)) {
                const radio = await item.$('input[type="radio"]');
                if (radio) {
                    await radio.evaluate(el => el.scrollIntoView({ behavior: 'auto', block: 'center' }));
                    await radio.click();
                    return;
                }
            }
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