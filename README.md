1.Cài node v18 (version cao hơn có thể lỗi)
2.Chạy lệnh npm install  
3.Chạy lệnh node index.js  
4.Các tham số   
url: "https://lms.pttc1.edu.vn/course/view.php?id=21303" => link vào môn học  
start: 7 => chương bắt đầu làm  
pointPass: 8 => nếu < 10 sẽ làm đủ điểm mở chương tiếp, nếu = 10 sẽ làm tới khi đạt điểm 10  
hasDapAn: true => true nếu khi submit xong có hiện đáp án đúng => sẽ đọc lưu đáp án đúng sử dụng cho lần làm lại  
maxRandom: 0 => số lần cho phép lần làm chọn đáp án ngẫu nhiên => sau đó sẽ tìm đáp án từ trong db nếu có  
isDone: false => true sẽ bỏ qua tương đương đã làm xong môn  
skipNormalLink: false => true sẽ bỏ qua click xem link tài liệu  
5.Trường hợp lỗi  
Nếu link tài liệu khi click thực hiện hành động tải file (khác hành động mở sang tab mới) => sẽ lỗi chưa fix  
