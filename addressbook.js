function Addressbook() {
    this._initUI();
};
Addressbook.prototype._log = function(message) {
    $('<p/>').text(message).appendTo('#message');
};
Addressbook.prototype._initUI = function() {
    var that = this;
    $('#fileInput').change(function() {
        var input = $('#fileInput')[0];
        if (!input.files || !input.files[0]) {
            that._log("Please select a file.");
            return;
        }
        var file = input.files[0];
        var fileReader = new FileReader();
        fileReader.onload = function() {
            that._clearVCards();
            VCF.parse(fileReader.result, that._addVCard, that);
        };
        fileReader.readAsText(input.files[0]);
    });
    $('.import').click(function() {
        var data = JSON.stringify(that.getData());
        window.open('data:text/json;charset=utf-8,' + escape(data));
    });
    $('.export').click(function() {
        var data = JSON.stringify(that.getData());
        window.open('data:text/json;charset=utf-8,' + escape(data));
    });
    $('.create-pdf').click(function() {
        that.createPDF(that.getData());
    });
};
Addressbook.prototype._clearVCards = function() {
    this._vcards = [];
};
Addressbook.prototype._addVCard = function(vcard) {
    this._vcards.push(vcard);
};
Addressbook.prototype.getData = function() {
    var that = this;
    return $.map(this._vcards, function(vcard) {
        var firstname = '';
        var lastname = '';
        var details = '';

        if (vcard.tel)
           $.each(vcard.tel, function(i, tel) { details += tel.value + '\n'; });
        if (vcard.email)
           $.each(vcard.email, function(i, email) { details += email.value + '\n'; });
        if (vcard.adr) {
            var fields = vcard.adr.value.split(';');
            details += fields[2] + "\n" + fields[5] + " " + fields[3] + "\n";
        }
        if (vcard.n && vcard.n['given-name'])
            firstname = vcard.n['given-name'][0];
        if (vcard.n && vcard.n['family-name'])
            lastname = vcard.n['family-name'][0];

        return {firstname: firstname,
                lastname: lastname,
                details: details};
    });
};
Addressbook.prototype.createPDF = function(data) {
    // A4 page
    var doc = new jsPDF('p', 'cm', [21, 29.7]);
    var options = {
        font: {fontSize: 12, fontStyle: '', fontName: 'Helvetica'},
        // borders inside a small page in cm
        // left and right is inverted for odd sheets
        borderLeft: 1.2,
        borderRight: .7,
        borderTop: .7,
        borderBottom: .7,
        // size of a small page in cm
        pageWidth: 8.4,
        pageHeight: 11.4};
    doc.setFont(options.font.fontName, options.font.fontStyle);
    doc.setFontSize(options.font.fontSize);

    var pages = this.splitIntoPages(doc, options, this.sort(data));
    this.renderOnSheets(doc, options, pages);

    doc.output('datauri');
};
Addressbook.prototype.sort = function(data) {
    data.sort(function(a, b) {
        a = [a.lastname, a.firstname];
        b = [b.lastname, b.firstname];
        return a < b ? -1 : 1;
    });
    return data;
};
Addressbook.prototype.splitIntoPages = function(doc, options, data) {
    var pages = [];
    while (data.length > 0) {
        pages.push(this.getNextPage(doc, options, data));
    }
    return pages;
};
Addressbook.prototype.getNextPage = function(doc, options, data) {
    var spacer = .3;
    var maxWidth = options.pageWidth - options.borderLeft - options.borderRight;
    var maxHeight = options.pageHeight - options.borderTop - options.borderBottom;
    var lineHeight = doc.internal.getLineHeight() / 28.125; // pt per cm
    var offsetVer = 0;
    var page = [];
    while (offsetVer < maxHeight && data.length > 0) {
        var text = data[0].firstname + ' ' + data[0].lastname + '\n' +
                   data[0].details;
        var lines = doc.splitTextToSize(text, maxWidth);
        if (offsetVer + lines.length * lineHeight > maxHeight && page.length > 0)
            break;
        page.push({"y": offsetVer,
                   "t": lines});
                   
        data.shift();
        offsetVer += (lines.length + spacer) * lineHeight;
    }
    return page;
};
Addressbook.prototype.renderOnSheets = function(doc, options, pages) {
    while (pages.length > 0) {
        this.renderSheetPair(doc, options, pages);
    }
};
Addressbook.prototype.renderSheetPair = function(doc, options, pages) {
    var sheetPair = [[], []];
    var index = 0;
    var x = 0;
    var y = 0;
    while (pages.length > 0) {
        var pageX = index == 0 ? x : doc.internal.pageSize.width - x - options.pageWidth;
        sheetPair[index].push({"x": pageX, "y": y, "p": pages[0]});
        pages.shift();
        if (index == 1) {
            index = 0;
            x += options.pageWidth;
            if (x + options.pageWidth > doc.internal.pageSize.width) {
                y += options.pageHeight;
                x = 0;
                if (y + options.pageHeight > doc.internal.pageSize.height)
                    break;
            }
        } else {
            index = 1;
        }
    }

    for (index = 0; index < 2; index ++) {
        var border = index == 0 ? options.borderLeft : options.borderRight;
        this.renderSheet(doc, options, border, sheetPair[index]);
        if (index == 0 || pages.length > 0)
            doc.addPage();
    }
};
Addressbook.prototype.renderSheet = function(doc, options, border, sheet) {
    doc.setLineWidth(.01);
    doc.setDrawColor(0, 0, 0, .5);

    for (var i = 0; i < sheet.length; i++) {
        doc.rect(sheet[i].x,
                 sheet[i].y,
                 options.pageWidth,
                 options.pageHeight,
                 'D');
        this.renderPage(doc,
                        sheet[i].p,
                        sheet[i].x + border,
                        sheet[i].y + options.borderTop);
    }
};
Addressbook.prototype.renderPage = function(doc, page, x, y) {
    for (var i = 0; i < page.length; i++) {
        doc.text(x,
                 page[i].y + y,
                 page[i].t);
    }
}

var addressbook;
$(function() {
    addressbook = new Addressbook();
});
