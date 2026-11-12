/**
 * Backend xác nhận tham dự (RSVP) cho thiệp cưới: Đỗ Quân & Minh Ngọc.
 *
 * Cách dùng (chi tiết trong HUONG-DAN.md):
 *   1. Tạo một Google Sheet mới → Tiện ích mở rộng → Apps Script → dán toàn bộ file này.
 *   2. Chọn hàm `setup` → Chạy (một lần) → cấp quyền.
 *   3. Triển khai → Tùy chọn triển khai mới → Ứng dụng web
 *        Thực thi với tư cách: Tôi   ·   Người có quyền truy cập: Bất kỳ ai
 *   4. Copy URL kết thúc bằng /exec, dán vào js/config.js (APPS_SCRIPT_URL).
 */

var SHEET_RSVP = 'RSVP';
var SHEET_SUMMARY = 'Tổng quan';
var HEADERS = ['Thời gian', 'Họ và tên', 'Số điện thoại', 'Tham dự', 'Số người', 'Khách của', 'Lời chúc', 'Số lần gửi'];
var ATTEND_YES = 'Sẽ đến';
var ATTEND_NO = 'Không đến';

/** Chạy một lần để tạo bảng và trang tổng quan. Chạy lại cũng an toàn. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sh = ss.getSheetByName(SHEET_RSVP) || ss.insertSheet(SHEET_RSVP, 0);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#838867').setFontColor('#fffdf8');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm');
  sh.getRange('C:C').setNumberFormat('@');
  sh.setColumnWidth(1, 140); sh.setColumnWidth(2, 200); sh.setColumnWidth(3, 130);
  sh.setColumnWidth(4, 90);  sh.setColumnWidth(5, 80);  sh.setColumnWidth(6, 90);
  sh.setColumnWidth(7, 360); sh.setColumnWidth(8, 90);
  if (!sh.getFilter()) sh.getRange(1, 1, Math.max(sh.getLastRow(), 2), HEADERS.length).createFilter();

  // Tô màu dòng theo trạng thái tham dự
  var rules = [
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$D2="' + ATTEND_YES + '"')
      .setBackground('#eef1dd').setRanges([sh.getRange('A2:H')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$D2="' + ATTEND_NO + '"')
      .setBackground('#f6ece6').setRanges([sh.getRange('A2:H')]).build()
  ];
  sh.setConditionalFormatRules(rules);

  var sum = ss.getSheetByName(SHEET_SUMMARY) || ss.insertSheet(SHEET_SUMMARY, 1);
  sum.clear();
  var y = '"' + ATTEND_YES + '"', n = '"' + ATTEND_NO + '"';
  var rows = [
    ['Chỉ số', 'Giá trị'],
    ['Tổng số phản hồi', '=COUNTA(RSVP!B2:B)'],
    ['Số lượt sẽ đến', '=COUNTIF(RSVP!D2:D,' + y + ')'],
    ['Tổng số khách sẽ đến (tính cả người đi cùng)', '=SUMIFS(RSVP!E2:E,RSVP!D2:D,' + y + ')'],
    ['   · Khách nhà trai', '=SUMIFS(RSVP!E2:E,RSVP!D2:D,' + y + ',RSVP!F2:F,"Nhà trai")'],
    ['   · Khách nhà gái', '=SUMIFS(RSVP!E2:E,RSVP!D2:D,' + y + ',RSVP!F2:F,"Nhà gái")'],
    ['Số lượt không đến', '=COUNTIF(RSVP!D2:D,' + n + ')'],
    ['Ước tính số bàn (10 khách/bàn)', '=ROUNDUP(B4/10,0)'],
    ['Cập nhật lần cuối', '=IFERROR(MAX(RSVP!A2:A),"")']
  ];
  sum.getRange(1, 1, rows.length, 2).setValues(rows);
  sum.getRange('A1:B1').setFontWeight('bold').setBackground('#838867').setFontColor('#fffdf8');
  sum.getRange('B9').setNumberFormat('dd/MM/yyyy HH:mm');
  sum.getRange('B2:B8').setFontWeight('bold').setFontSize(13);
  sum.setColumnWidth(1, 340); sum.setColumnWidth(2, 160);
}

function doGet() {
  return json_({ ok: true, service: 'rsvp' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Ô chống spam: bot điền vào ô ẩn "website"
    if (body.website) return json_({ ok: true });

    var name = clean_(body.name, 80);
    if (name.length < 2) return json_({ ok: false, error: 'name' });

    var phone = String(body.phone || '').replace(/[^\d]/g, '').slice(0, 15);
    var attending = body.attending === 'no' ? ATTEND_NO : ATTEND_YES;
    var guests = attending === ATTEND_YES ? Math.min(Math.max(parseInt(body.guests, 10) || 1, 1), 20) : 0;
    var side = body.side === 'Nhà gái' ? 'Nhà gái' : 'Nhà trai';
    var wish = clean_(body.wish, 500);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_RSVP);
    if (!sh) { setup(); sh = ss.getSheetByName(SHEET_RSVP); }

    // Cùng số điện thoại gửi lại → cập nhật dòng cũ thay vì tạo dòng trùng
    var row = 0, count = 1;
    if (phone) {
      var last = sh.getLastRow();
      if (last > 1) {
        var phones = sh.getRange(2, 3, last - 1, 1).getValues();
        for (var i = phones.length - 1; i >= 0; i--) {
          if (String(phones[i][0]) === phone) {
            row = i + 2;
            count = (parseInt(sh.getRange(row, 8).getValue(), 10) || 1) + 1;
            break;
          }
        }
      }
    }
    if (!row) row = sh.getLastRow() + 1;

    sh.getRange(row, 3).setNumberFormat('@');
    sh.getRange(row, 1, 1, HEADERS.length).setValues([[new Date(), name, phone, attending, guests, side, wish, count]]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Cắt độ dài, bỏ ký tự điều khiển, chặn công thức (=, +, -, @) để tránh formula injection. */
function clean_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
