let activeTab = 0;
let isBgMuted = true;
let gameView = null;
let callCount = 0;

$(document).ready(function () {
    if (!isNaN(routeId)) {
        loadGame(routeId);
    } else {
        loadTab(activeTab);
    }
});

$("#rbc-app").on('click', '.rbc-games-tab', function (e) {
    e.preventDefault();
    activeTab = $(this).data('id');

    loadTab(activeTab);
});

$("#rbc-app").on('click', '.rbc-game-launcher', function (e) {
    e.preventDefault();
    let gameId = $(this).data('id');
    
    loadGame(gameId);
});

function loadTab(tabId, skipPush = false) {
    $.ajax({
        type: "GET",
        url: "/common/galaxy/?handler=tab&tabId=" + tabId,
        success: function (result) {
            $("#rbc-app").html(result);
            if (gameView != null && gameView.$destroy) {
                gameView.$destroy();
            }
            if (!skipPush) {
                history.pushState({ tabId: tabId }, "", `/Common/Galaxy`);
            }
        },
        error: function () {
            Toastertoshow("Game Not Found", 2);
        }
    });
}

function loadGame(gameId, skipPush = false) {
    $.ajax({
        type: "GET",
        url: "/Common/galaxy/?handler=gameLaunch&tabId=" + activeTab + "&id=" + gameId,
        success: function (result) {
            $("#rbc-app").html(result);
            if (!skipPush) {
                history.pushState({ gameId: gameId }, "", `/Common/Galaxy/${gameId}`);
            }
            initGameView(gameId);
        },
        error: function () {
            Toastertoshow("Game Not Found", 2);
        }
    });
}
function initGameView(gameId) {
    if (gameView != null && gameView.$destroy) {
        gameView.$destroy(); // Vue instance destruction
    }

    gameView = new Vue({
        el: "#rbc-game-view",
        mixins: [timerMixin, SnapShotMixin, crashGameMixin],
        data: {
            gameId: gameId,
            traceEnabled: false,
            MyAvOrders: 'MyAvOrd',
            OrdersList: [],
            snapshot: [],
            positions: [],
            results: [],
            AviatorListAdv: [],
            casinoUrl: null,
            results: [],
            shortresults: [],
            ExMatched: [],
            activeChipIndex: null,
            ActiveChipsOrders: [],
            RouletteSubmit: false,
            chips: [
                { img: '/img/chip1.svg', value: (typeof stake1 !== 'undefined' ? stake1 : 0) },
                { img: '/img/chip2.svg', value: (typeof stake2 !== 'undefined' ? stake2 : 0) },
                { img: '/img/chip3.svg', value: (typeof stake3 !== 'undefined' ? stake3 : 0) },
                { img: '/img/chip4.svg', value: (typeof stake4 !== 'undefined' ? stake4 : 0) }
            ],
            Order: {
                render: false,
                RoundId: 1,
                MarketId: 1,
                price: 1.01,
                size: 0,
                side: 'B',
                selectionId: 0,
                ChannelId: 1,
                isFixOdds: false,
                runnerName: '',
                working: false,
                BetType: '',
                error: '',
                Selection: 0
            }
        },
        created: function () {
            this.sToken = typeof token !== 'undefined' ? token : null;
            this.casinoUrl = typeof casinoUrl !== 'undefined' ? casinoUrl : null;
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            window.addEventListener("popstate", function (event) {
                const state = event.state;

                if (state && state.gameId) {
                    loadGame(state.gameId, true);
                } else if (state && state.tabId !== undefined) {
                    loadTab(state.tabId, true);
                } else {
                    // fallback if state is null, try to parse from URL
                    const segments = window.location.pathname.split("/");
                    const last = segments[segments.length - 1];
                    if (!isNaN(last)) {
                        loadGame(last, true);
                    } else {
                        loadTab(0, true);
                    }
                }
            });
            this.Connect();
            this.ChipSelector(0);
        },
        computed: {
            isConnected: function () {
                if (typeof CasSck !== 'undefined') {
                    return CasSck === 0 ? true : this.isSignalRConnected;
                }
            },
            currentMarketId: function () {
                return this.snapshot.id;
            },
            RouletteOrders: function () {
                return this.ActiveChipsOrders.reduce((sum, order) => sum + (order.size || 0), 0); // Sum of sizes
            },
            PreRID: function () {
                if (this.snapshot.id !== null && this.snapshot.id !== undefined) {
                    let parts = this.snapshot.id.split('-');
                    return parts.length > 2 ? parts.slice(2).join('-') : '';
                    return parts.length > 2 ? parts.slice(2).join('-') : '';
                }
                return null;
            }
        },
        destroyed: function () {
            this.DisconnectRbc();
        },
        watch: {
            timeLeft: function (newVal, oldVal) {
                    if (this.snapshot.state == 4 || this.snapshot.state == 3) {
                        this.ResetRoulette();
                    }
                    if (this.snapshot.state == 1 && (newVal <= 1)) {
                        if (this.RouletteSubmit == false && this.ActiveChipsOrders.length > 0) {
                            this.RouletteSubmit = true;
                            this.SubmitBulkOrders();
                        }
                    }
            },
            
        },
        methods: {
            SyncTimer: function (timeLimit, progress) {
                const self = this;
                let initialValue = timeLimit;
                if (timeLimit == 0) {
                    self.timeLeft = 0;
                    self.OnTimesUp();
                    return;
                }
                timeLimit = timeLimit - 5;
                
                let elapsed = Math.round(progress / 100 * timeLimit);

                // timer already running
                if (this.timerInterval !== null) {

                    if (Math.abs(elapsed - self.timePassed) >= 2) {
                        self.OnTimesUp();
                    }
                    else {
                        return;
                    }
                }

                self.timePassed = elapsed;
                self.timeLimit = timeLimit;
                self.timeLeft = self.timeLimit - self.timePassed;


                this.timerInterval = setInterval(() => {

                    self.timePassed += 1;
                    self.timeLeft = self.timeLimit - self.timePassed;

                    self.setCircleDasharray();
                    self.setRemainingPathColor(self.timeLeft);

                    if (self.timeLeft === 0) {
                        self.OnTimesUp();
                    }
                }, 1000);

            },
            SetSignalRposition: function () { },
            SetSnapshot: function (SNPSHT) {
                let self = this;
                self.snapshot = SNPSHT;
                self.ActiveRoundId = SNPSHT.id;
                if (typeof CasSck !== 'undefined' && CasSck === 1) {
                    self.SyncTimer(parseInt(SNPSHT.remainingTime.split(':')[2]), parseInt(SNPSHT.completionPercentage));
                }
            },
            Trace: function (message) {
                if (this.traceEnabled) {
                    console.log(message);
                }
            },
            Toastertoshow: function (mess, value) {
                const toastrcolor = {
                    1: 'success',
                    2: 'error',
                    3: 'warning',
                    4: 'info'
                };

                toastr.options = {
                    "closeButton": false,
                    "debug": false,
                    "newestOnTop": false,
                    "progressBar": false,
                    "positionClass": "toast-top-center",
                    "preventDuplicates": false,
                    "onclick": null,
                    "showDuration": "300",
                    "hideDuration": "1000",
                    "timeOut": "5000",
                    "extendedTimeOut": "1000",
                    "showEasing": "swing",
                    "hideEasing": "linear",
                    "showMethod": "fadeIn",
                    "hideMethod": "fadeOut"
                };

                const status = toastrcolor[value];
                toastr[status](mess);
            },
            GetButtonshades: function () {
                const gradientColors = [
                    { from: "#2bc46b", to: "#59e49f" }, // Green (Cricket)
                    { from: "#3f6fd1", to: "#56a2f5" }, // Blue (Basketball)
                    { from: "#ffbb33", to: "#ffcc66" }  // Yellow-Golden (Football)
                ];
                const gradient = gradientColors[callCount % gradientColors.length];
                callCount++;

                return `background: linear-gradient(90deg, ${gradient.from} 0%, ${gradient.to} 100%);`;
            },
            getUserBadgeColor: function (username) {
                const colors = ["#8a47ff", "#ff6b6b", "#2bc46b", "#ffbb33", "#3f6fd1"];
                let hash = 0;
                for (let i = 0; i < username.length; i++) {
                    hash = username.charCodeAt(i) + ((hash << 5) - hash);
                }
                return colors[Math.abs(hash) % colors.length];
            },
            getInitials: function(username) {
                return username ? username.split(' ').map(n => n[0]).join('').toUpperCase() : "";
            },
            isChipActive: function (index) {
                return this.activeChipIndex === index;
            },
            ChipSelector: function (index) {
                this.activeChipIndex = index;
                const chipValue = this.chips[index].value;
                console.log('Selected chip value:', chipValue);
            },
            UnDoRoulette: function () {
                var self = this;
                if (self.snapshot.state !== 1 || parseInt(this.timeLeft) < 2) {
                    this.Toastertoshow("Wait For Next Round", 2);
                    return;
                }
                if (this.ActiveChipsOrders && this.ActiveChipsOrders.length > 0) {
                    this.ActiveChipsOrders.pop();
                }
            },
            ResetRoulette: function () {
                this.ActiveChipsOrders = [];
                this.RouletteSubmit = false;
            },
            HaveOrder: function (Name) {
                return this.ActiveChipsOrders.some(order => order.runnerName === Name);
            },
            GetPlacedChipImg: function (Name) {
                const order = this.ActiveChipsOrders.find(o => o.runnerName === Name);
                if (order) {
                    const orderSize = order.size;
                    const chip = this.chips.find(c => parseInt(c.value) === orderSize);
                    if (chip) {
                        return chip.img;
                    }
                }
                return null;
            },
            ChipText: function (Name) {
                let totalSize = 0;
                if (Array.isArray(this.ActiveChipsOrders)) {
                    this.ActiveChipsOrders.forEach(order => {
                        if (order.runnerName === Name) {
                            totalSize += order.size ? parseInt(order.size) : 0;
                        }
                    });
                }
                if (totalSize >= 1000) {
                    return (totalSize / 1000) + 'k';
                } else {
                    return totalSize;
                }
            },
            PlaceOrder: function (Name, SID) {
                var self = this;
                if (!this.ActiveChipsOrders) {
                    this.ActiveChipsOrders = [];
                }
                if (self.snapshot.state !== 1 || parseInt(this.timeLeft) < 2) {
                    this.Toastertoshow("Wait For Next Round", 2);
                    return;
                }
                if (this.activeChipIndex == null || this.activeChipIndex == undefined) {
                    this.Toastertoshow("Please select chip to place order", 3);
                    return;
                }
                var price = this.GetBackPrice(SID);
                if (price == 0) return;
                const newOrder = {};
                newOrder.side = 'B';
                const chipValue = this.chips[parseInt(this.activeChipIndex)].value;
                newOrder.size = parseInt(chipValue);
                newOrder["MarketId"] = self.ActiveRoundId;
                newOrder["price"] = parseFloat(price);
                newOrder["RoundId"] = self.ActiveRoundId;
                newOrder["ChannelId"] = this.gameId.toString();
                newOrder["runnerName"] = Name;
                newOrder["identity"] = GetDeviceIdentity();
                newOrder["BetType"] = "Back";
                newOrder["Selection"] = SID;
                newOrder["Metadata"] = Name;
                this.ActiveChipsOrders.push(newOrder);
            },
            GetBackPrice: function (SID) {
                var self = this;
                var Selection = _.find(self.snapshot.marketSelections, function (User) {
                    return SID == User.id
                });
                if (Selection == null || Selection == undefined) {
                    return 0;
                }

                return Selection.backPrice;
            },
            getCardSerialNo: function (suit, rank) {
                switch (suit) {
                    case Suit.Clubs: // Clubs = 2
                        return rank === 1 ? 0 : rank - 1;
                    case Suit.Diamonds: // Diamonds = 3
                        return rank === 1 ? 13 : 12 + rank;
                    case Suit.Hearts: // Hearts = 0
                        return rank === 1 ? 26 : 25 + rank;
                    case Suit.Spades: // Spades = 1
                        return rank === 1 ? 39 : 38 + rank;
                    default:
                        return ("NOT AVAILABLE");
                }
            },
            ImageUrl: function (number) {
                let baseurl = "/img/Cards/card_simple_";
                if (number == "NOT AVAILABLE") {
                    return "/img/Cards/card_simple_omaha_back.svg";
                } else {
                    baseurl = baseurl + number + ".svg"
                }
                return baseurl;

            },
            UpDown7ImageUrl: function () {
                if (!this.snapshot.communityCards || this.snapshot.communityCards.length === 0 || !this.snapshot.communityCards[0]) {
                    return "/img/Cards/card_simple_omaha_back.svg";
                }
                let suit = this.snapshot.communityCards[0].suit;
                let rank = this.snapshot.communityCards[0].rank;
                if (rank === 14) rank = 1;

                let number = this.getCardSerialNo(suit, rank);
                let baseurl = "/img/Cards/card_simple_";

                if (number == "NOT AVAILABLE") {
                    baseurl = baseurl + "omaha_back_bf.svg";
                } else {
                    baseurl = baseurl + number + ".svg"
                }
                return baseurl;
            },
            updown7valid: function (min, max) {
                let self = this;
                if (!Array.isArray(self.snapshot.communityCards) || self.snapshot.communityCards.length === 0 || !self.snapshot.communityCards[0]) {
                    return false;
                }
                let rank = self.snapshot.communityCards[0].rank;
                if (rank === 14) rank = 1;
                return rank >= min && rank <= max;
            },
            SubmitBulkOrders: function () {
                var self = this;
                var qs = '/api/v2/Orders/game/rb-b/' + this.gameId.toString();

                if (CasSck === 1 && !this.isSignalRConnected) {
                    self.ResetRoulette();
                    console.log("Socket Disconnected. Try Again");
                    return;
                }

                self.Toastertoshow("Submitting Orders", 1);

                const consolidatedOrders = {};

                // Loop through ActiveChipsOrders to consolidate sizes
                this.ActiveChipsOrders.forEach(order => {
                    const key = `${order.Metadata}`;

                    if (!consolidatedOrders[key]) {
                        consolidatedOrders[key] = {
                            error: "",
                            render: false,
                            side: 'b',
                            size: 0, // Initialize size to 0
                            MarketId: order.MarketId,
                            price: order.price,
                            RoundId: order.RoundId,
                            ChannelId: this.gameId.toString(),
                            runnerName: order.runnerName,
                            identity: order.identity,
                            BetType: "Back",
                            Selection: order.Selection,
                            Metadata: order.Metadata
                        };
                    }

                    consolidatedOrders[key].size += order.size;
                });

                const newConsolidatedOrders = Object.values(consolidatedOrders);

                if (newConsolidatedOrders.length === 0) {
                    self.Toastertoshow("No orders to submit", 2);
                    return;
                }

                $.ajax({
                    type: "POST",
                    url: qs,
                    data: JSON.stringify(newConsolidatedOrders),
                    contentType: "application/json; charset=utf-8",
                    success: function (result) {
                        self.Toastertoshow("Orders Placed Successfully", 1);
                    },
                    error: function (data) {
                        self.ResetRoulette();
                        console.error("Error submitting orders:", data);
                        if (data.responseJSON && data.responseJSON.title) {
                            self.Toastertoshow(data.responseJSON.title, 2);
                        } else {
                            self.Toastertoshow("An error occurred while submitting orders.", 2);
                        }
                    }
                });
            },
            Checkwinner: function (SID) {
                var self = this;
               return  _.find(self.snapshot.marketSelections, function (User) {
                    return SID == User.id && User.status == 'WINNER'
                });
            },
            CheckHiLowRank: function (ID) {
                var self = this;
                if (self.snapshot.communityCards && self.snapshot.communityCards.length > 1) {
                    var Found = self.snapshot.communityCards[1].rank;

                    if (Found) {
                        if (ID == 1 && Found > self.snapshot.communityCards[0].rank) {
                            var number = this.getCardSerialNo(self.snapshot.communityCards[1].suit, self.snapshot.communityCards[1].rank == 14 ? 1 : self.snapshot.communityCards[1].rank);
                            return this.ImageUrl(number);
                        }
                        if (ID == 3 && Found < self.snapshot.communityCards[0].rank) {
                            var number = this.getCardSerialNo(self.snapshot.communityCards[1].suit, self.snapshot.communityCards[1].rank == 14 ? 1 : self.snapshot.communityCards[1].rank);
                            return this.ImageUrl(number);
                        }
                    }
                }
                return this.ImageUrl('NOT AVAILABLE');
            },
            PlayerDefaultCard: function (SID) {
                var self = this;
                var User =  _.find(self.snapshot.players, function (User) {
                    return SID == User.id;
                });
                if (User)
                {
                    if (User.cards[0] && User.cards[0].suit !== null ) {
                        var number = this.getCardSerialNo(User.cards[0].suit, User.cards[0].rank == 14 ? 1 : User.cards[0].rank);
                        return this.ImageUrl(number);
                    }
                }

                return this.ImageUrl('NOT AVAILABLE');
            },
            Pong: function () {
                let latency = new Date().getTime() - this.pingTime;
                let wavesContainer = document.querySelector(".waveStrength-3");
                wavesContainer.className = "waveStrength-3";
                if (latency > 200 && latency <= 400) {
                    document.querySelector(".wv4").style.borderTopColor = "#C0C0C0"; // Top wave silver
                } else if (latency > 400 && latency <= 800) {
                    document.querySelector(".wv4").style.borderTopColor = "#C0C0C0"; // Top wave silver
                    document.querySelector(".wv3").style.borderTopColor = "#C0C0C0"; // Second wave silver
                } else if (latency > 800) {
                    document.querySelector(".wv4").style.borderTopColor = "#C0C0C0"; // Top wave silver
                    document.querySelector(".wv3").style.borderTopColor = "#C0C0C0"; // Second wave silver
                    document.querySelector(".wv2").style.borderTopColor = "#C0C0C0"; // Third wave silver
                }
            },
            UpdateConnections: function (count) {
                count = (isNaN(count) ? 0 : Number(count)) + 50;
                let el = document.getElementById("UsersCount");
                if (el !== null) {
                    el.innerText = count;
                }
            },
            RullesViewer: function () {
                var file = "/" + this.gameId.toString() + ".html";

                $.get(file)
                    .done(function (data) {
                        if (data.includes("content=\"notranslate\"")) {
                            $("#RBRulles .modal-body").html("<div style='text-align:center;'>Rules not found.</div>");
                        } else {
                            $("#RBRulles .modal-body").html(data);
                        }
                        document.getElementById("RBRulles").style.display = "flex";
                    })
                    .fail(function () {
                    });
            }
        }
    })
}

Vue.filter('formatchip', function (stake) {
    return stake < 1000 ? stake : (stake / 1000).toFixed() + 'k';
});
const Suit = {
    Hearts: 0,
    Spades: 1,
    Clubs: 2,
    Diamonds: 3
};
const Rank = {
    Two: 2, Three: 3, Four: 4, Five: 5, Six: 6,
    Seven: 7, Eight: 8, Nine: 9, Ten: 10,
    Jack: 11, Queen: 12, King: 13, Ace: 14
};