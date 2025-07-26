class ReportViewer {
    constructor(container, page, mainHandler, handler2, handler3, handler4) {
        this.container = container;
        this.page = page;
        this.mainHandler = mainHandler;
        this.handler2 = handler2;
        this.handler3 = handler3;
        this.handler4 = handler4;

        this.el = $(container);

        this.from = document.getElementById("DisplayFrom");
        this.to = document.getElementById("DisplayTo");

        this.leftBox = document.createElement("div");
        this.leftBox.setAttribute('class', 'col-12 col-md-6');

        this.rightBox = document.createElement("div");
        this.rightBox.setAttribute('class', 'col-12 col-md-6');

        this.rightTopBox = document.createElement("div");
        this.rightTopBox.setAttribute('class', 'col-12');

        this.rightBotBox = document.createElement("div");
        this.rightBotBox.setAttribute('class', 'col-12');

        $(this.rightBox).append(this.rightTopBox);
        $(this.rightBox).append(this.rightBotBox);

        $(this.el).append(this.leftBox).append(this.rightBox);

        this.lastId = 0;
        this.lastId2 = 0;

        this.loader = new PageLoader();

        this.init();

    }

    init() {        
        var self = this;
        $(this.leftBox).on('click', 'td > a', function (e) {
            e.preventDefault();
            const id = $(this).data('id');

            if (id === undefined || id === null) {
                return;
            }

            self.lastId = id;
            self.fetchSecondReport(id);

        });

        $(this.rightTopBox).on('click', 'td > a', function (e) {
            e.preventDefault();
            const id = $(this).data('id');

            if (id === undefined || id === null) {
                return;
            }

            self.lastId2 = id;
            self.fetchThirdReport(self.lastId, self.lastId2);
        });

        $(this.rightBotBox).on('click', 'td > a', function (e) {
            e.preventDefault();

            const url = $(this).attr('href');

            self.popupReport(url);
        });
    }

    fetchMainReport() {
        const params = new URLSearchParams({
            handler: this.mainHandler,
            from: localDateToUtc(this.from.value),
            to: localDateToUtc(this.to.value)
        });
        this.fetchReport(this.page, params.toString(), this.leftBox, true);
    }

    fetchSecondReport(id) {
        var NewFrom = document.getElementById("DateFromNew").innerText;
        var NewTo = document.getElementById("DateToNew").innerText;
        if (NewFrom != '' && NewTo != '') {
            this.from.value = document.getElementById("DateFromNew").innerText;
            this.to.value = document.getElementById("DateToNew").innerText;
        };
        const params = new URLSearchParams({
            handler: this.handler2,
            from: localDateToUtc(this.from.value),
            to: localDateToUtc(this.to.value),
            id: id
        });

        this.fetchReport(this.page, params.toString(), this.rightTopBox, false);
    }

    fetchThirdReport(id, id2) {
        var NewFrom = document.getElementById("DateFromNew").innerText;
        var NewTo = document.getElementById("DateToNew").innerText;
        if (NewFrom != '' && NewTo != '') {
            this.from.value = document.getElementById("DateFromNew").innerText;
            this.to.value = document.getElementById("DateToNew").innerText;
        };

        const params = new URLSearchParams({
            handler: this.handler3,
            from: localDateToUtc(this.from.value),
            to: localDateToUtc(this.to.value),
            id: id,
            id2: id2
        });

        this.fetchReport(this.page, params.toString(), this.rightBotBox, false);
    }

    fetchReport(page, queryString, reportSection, isDataTable) {
        var self = this;
        self.loader.show();
        $.ajax({
            type: 'GET',
            url: page + '?' + queryString,
            success: function (result) {
                reportSection.innerHTML = result;

                convertAllToClientTime(reportSection);

                if (isDataTable) {
                    self.activateTables(reportSection);
                }

                self.loader.hide();
            },

            error: function (exception) {
                self.loader.hide();
            }
        });
    }

    generateReport() {
        const params = new URLSearchParams({
            handler: this.handler4,
            from: localDateToUtc(this.from.value),
            to: localDateToUtc(this.to.value)
        });

        this.fetchReport(this.page, params.toString(), this.leftBox, false);
    }

    activateTables(el) {
        try {
            $(el).find('table').DataTable({
                "paging": false,
                "info": false,
                "searching": false,
                "order": [[0, "asc"]]
            });
        }
        catch { }
    }

    popupReport(url) {
        const newwindow = window.open(url, "Market Position", 'height=650,width=800');
        if (window.focus) { newwindow.focus() }
        return false;
    }
}

class PageLoader {
    constructor() {
        this.img = "/img/loadinggif.gif";
        this.render();
    }

    render() {
        this.isRendered = true;
        this.el = document.createElement('div');
        this.el.setAttribute('class', 'loader');
        this.el.innerHTML = '<img src="' + this.img + '" />';
        this.el.style.display = 'none';

        const parentContainer = document.querySelector('.container-fluid');
        parentContainer.insertBefore(this.el, parentContainer.children[0]);
    }

    show() {
        this.el.style.display = 'block';
    }

    hide() {
        this.el.style.display = 'none';
    }
}