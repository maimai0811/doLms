// const Datastore = require('nedb');


// const db = new Datastore({ filename: 'tthcm.db', autoload: true });


// db.insert({ name: 'Alice', age: 25 });

// // Query theo field
// db.find({ age: { $gt: 20 } }, (err, docs) => {
//   console.log(docs); // [{ name: 'Alice', age: 25 }]
// });


const Datastore = require('nedb');
const path = require('path');

// Lưu trữ kết nối DB theo từng môn
const dbInstances = {};

// Tạo hoặc lấy lại DB nếu đã tồn tại
function connectDb(mon) {
    if (!dbInstances[mon]) {
        dbInstances[mon] = new Datastore({
            filename: path.join(__dirname, `${mon}_question.db`),
            autoload: true
        });
    }
    return dbInstances[mon];
}

// Tạo object câu hỏi
function Question(question, answer, other, subject, chapter) {
    return {
        question,
        answer,
        other,
        subject,
        chapter
    };
}

// Tìm câu hỏi trong DB
function getQuestionInDbByQuestionName(db, subject, chapter, questionText) {
    return new Promise((resolve, reject) => {
        db.findOne({ subject, chapter, question: questionText }, (err, doc) => {
            if (err) return reject(err);
            resolve(doc);
        });
    });
}

// Thêm câu hỏi mới vào DB
function insertQuestionToDb(db, question) {
    return new Promise((resolve, reject) => {
        db.insert(question, (err, newDoc) => {
            if (err) return reject(err);
            resolve(newDoc);
        });
    });
}

// Cập nhật đáp án
function updateQuestionToDb(db, id, answer, other) {
    return new Promise((resolve, reject) => {
        db.update({ _id: id }, { $set: { answer, other } }, {}, (err, numReplaced) => {
            if (err) return reject(err);
            resolve(numReplaced);
        });
    });
}

async function saveDapAn(cauHoi, dapAn, khac, mon, chuong) {
    const db = connectDb(mon);

    try {
        const questionInDb = await getQuestionInDbByQuestionName(db, mon, chuong, cauHoi);

        // Nếu có đáp án đúng
        if (dapAn) {
            if (!questionInDb) {
                const questionToDb = Question(cauHoi, dapAn, "", mon, chuong);
                await insertQuestionToDb(db, questionToDb);
            } else {
                const currentAnswer = typeof questionInDb.answer === 'string' ? questionInDb.answer : '';
                const answersArray = currentAnswer ? currentAnswer.split("<<<<>>>>") : [];

                // Chỉ kiểm tra nếu answer hiện tại KHÁC rỗng
                const shouldUpdate = currentAnswer === ''
                    || !answersArray.includes(dapAn);

                if (shouldUpdate) {
                    const updatedAnswer = currentAnswer
                        ? currentAnswer + "<<<<>>>>" + dapAn
                        : dapAn;
                    const currentOther = typeof questionInDb.other === 'string' ? questionInDb.other : '';
                    await updateQuestionToDb(db, questionInDb._id, updatedAnswer, currentOther);
                }
            }
        }

        // Nếu có đáp án sai
        else if (khac) {
            if (!questionInDb) {
                const questionToDb = Question(cauHoi, "", khac, mon, chuong);
                await insertQuestionToDb(db, questionToDb);
            } else {
                const currentOther = typeof questionInDb.other === 'string' ? questionInDb.other : '';
                const othersArray = currentOther ? currentOther.split("<<<<>>>>") : [];

                const shouldUpdate = currentOther === ''
                    || !othersArray.includes(khac);

                if (shouldUpdate) {
                    const updatedOther = currentOther
                        ? currentOther + "<<<<>>>>" + khac
                        : khac;
                    const currentAnswer = typeof questionInDb.answer === 'string' ? questionInDb.answer : '';
                    await updateQuestionToDb(db, questionInDb._id, currentAnswer, updatedOther);
                }
            }
        }

    } catch (err) {
        console.error(`❌ Lỗi khi lưu đáp án [${mon} - chương ${chuong}]`);
        console.error(err);
    }
}


// Hàm chính lưu đáp án
// async function saveDapAn(cauHoi, dapAn, khac, mon, chuong) {
//     const db = connectDb(mon);

//     try {
//         const questionInDb = await getQuestionInDbByQuestionName(db, mon, chuong, cauHoi);

//         if (dapAn) {
//             if (!questionInDb) {
//                 const questionToDb = Question(cauHoi, dapAn, "", mon, chuong);
//                 await insertQuestionToDb(db, questionToDb);
//             } else {
//                 if (!questionInDb.answer || !questionInDb.answer.includes(dapAn)) {
//                     const updatedAnswer = questionInDb.answer
//                         ? questionInDb.answer + "<<<<>>>>" + dapAn
//                         : dapAn;
//                     await updateQuestionToDb(db, questionInDb._id, updatedAnswer, questionInDb.other || "");
//                 }
//             }
//         } else if (khac) {
//             if (!questionInDb) {
//                 const questionToDb = Question(cauHoi, "", khac, mon, chuong);
//                 await insertQuestionToDb(db, questionToDb);
//             } else {
//                 if (!questionInDb.other || !questionInDb.other.includes(khac)) {
//                     const dapAnSai = questionInDb.other
//                         ? questionInDb.other + "<<<<>>>>" + khac
//                         : khac;
//                     await updateQuestionToDb(db, questionInDb._id, questionInDb.answer || "", dapAnSai);
//                 }
//             }
//         }
//     } catch (err) {
//         console.error(`❌ Lỗi khi lưu đáp án [${mon} - chương ${chuong}]`);
//         console.error(err);
//     }
// }

module.exports = {
    connectDb,
    getQuestionInDbByQuestionName,
    saveDapAn
};
