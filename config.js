module.exports = {
  loginUrl: 'https://lms.pttc1.edu.vn/login/index.php',     // URL trang đăng nhập
  // testUrl: 'https://example.com/test',       // URL bài kiểm tra
  // username: '',
  // password: '',

  // username: '',
  // password: '',

  selectors: {
    usernameInput: '#username',
    passwordInput: '#password',
    loginButton: '#loginbtn',
    questionContainer: '.question',
    option: '.option',
    nextButton: '.next-btn',
    submitButton: '.submit-btn'
  },
  listCourseUrl: {
    "tthcm": {url: "https://lms.pttc1.edu.vn/course/view.php?id=17860", start: 0, pointPass: 10, hasDapAn: true, maxRandom: 0, isDone: true},
    'trr1': {url: "https://lms.pttc1.edu.vn/course/view.php?id=17906", start: 0, pointPass: 10, hasDapAn: false, maxRandom: 0, isDone: true},
    "ltccc": {url: "https://lms.pttc1.edu.vn/course/view.php?id=17923", start: 0, pointPass: 10, hasDapAn: false, maxRandom: 0, isDone: true},
    "ktmt": {url: "https://lms.pttc1.edu.vn/course/view.php?id=17911", start: 0, pointPass: 10, hasDapAn: false, maxRandom: 0, isDone: true},
    "lttt": {url: "https://lms.pttc1.edu.vn/course/view.php?id=17915", start: 3, pointPass: 10, hasDapAn: false, maxRandom: 0, isDone: false, skipNormalLink: true},
    "ctdl": {url: "https://lms.pttc1.edu.vn/course/view.php?id=17830", start: 0, pointPass: 10, hasDapAn: false, maxRandom: 0, isDone: true},
    "taa12": {url: "https://lms.pttc1.edu.vn/course/view.php?id=17931", start: 0, pointPass: 10, hasDapAn: false, maxRandom: 0, isDone: true},

  }
};
