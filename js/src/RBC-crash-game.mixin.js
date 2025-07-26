const crashGameMixin = {
    data: function () {
        return {
            clientSeed: null,
            crashGamePrice: null,
            gameState: GameState.CLOSED,
            runnersCount: 2,
            betActions: [],
            AviatorLUckyPlayers: [],
            currencyRate: 1,
            autoPriceIntvl: null,
            latency: 0,
            pingTime: 0,
            funfactvalue:"The best day to play is.. Everyday!"
        }
    },
    created: function () {
        let self = this;

        this.clientSeed = this.GetClientSeed();

        let defBetSize = 0;
        let defBetSizeEl = document.querySelector("#defaultBetSize");

        if (defBetSizeEl != null) {
            defBetSize = defBetSizeEl.value;
        }
        
        this.currencyRate = 1;
        let currencyEl = document.querySelector("#userCurrencyRate");

        if (currencyEl != null) {
            this.currencyRate = currencyEl.value;
        }

        for (let i = 1; i <= this.runnersCount; i++) {
            this.betActions.push({
                id: i,
                title: "Next",
                action: "bet",
                betSize: parseInt(defBetSize),
                betState: OrderState.EMPTY,
                autoBet: false,
                autoCashout: false,
                autoCashoutPrice: 1.1,
                visible: true,
                isPartialCashoutDisabled: false,
                BlastPwinloseamount: 0,
                cssClasses: { btn: true, 'btn-success': true, 'btn-info': false },
                winloseamount:0
            });
        }

        setInterval(() => { self.PingTest() }, 5000);
        window.addEventListener('resize', this.resizeCanvas);
    },
    computed: {
        isOrderEnqueued: function () {
            return this.betActions.find(x => x.betState === OrderState.QUEUED) != null;
        },
        isOrderSubmitted: function () {
            return this.betActions.find(x => x.betState === OrderState.SUBMITTED) != null;
        },
        displayPrice: function () {
            if (this.crashGamePrice == null) {
                return " - ";
            }
            if (this.gameId.toString() == 777701 && this.snapshot.state == 2) {
               this.RunningCanvas();
            }
            return "x " +  this.crashGamePrice.toFixed(2);

        }
    },
    watch: {
        timeLeft: function (newVal, oldVal) {
            if (this.snapshot.state !== 2) {
                this.betActions.forEach((element) => {
                    if (element.title != "Cashout") {
                        element.cssClasses['disabled'] = false;
                        element.cssClasses['EnablePointers'] = false;
                    }
                });
            }

            if (this.snapshot.state !== 1) {
                return;
            }
            if (newVal <= 1) {
                this.betActions.forEach((element) => {
                    if (element.title == "Place") {
                        element.cssClasses['disabled'] = true;
                        element.cssClasses['EnablePointers'] = true;
                    }
                });
            }

            if (newVal >= 1 && newVal <= 2) {
                this.betActions.forEach(function (element) {
                    if (element.autoBet) {
                        element.betState = OrderState.QUEUED;
                    }
                    element.winloseamount = 0;
                });
            }

            if (newVal <= 1) {
                this.SubmitOrders();
            }
            
        },
        snapshot: function (newVal, oldVal) {

            this.Trace(newVal);
            if (newVal == null ||
                newVal.players == null ||
                newVal.state == undefined) {
                return;
            }

            let prevPrice = 1.1;
            if (oldVal != null && oldVal.players != null) {
                prevPrice = parseFloat(oldVal.players[0].description);
            }

            if (parseFloat(newVal.players[0].description) != null &&
                parseFloat(newVal.players[0].description) != prevPrice) {

                this.UpdateCrashGamePrice(parseFloat(newVal.players[0].description));
            }

            switch (newVal.state) {
                case 1:
                    this.gameState = GameState.OPEN;
                    break;
                case 2:
                    this.gameState = GameState.CASHOUT;
                    break;
                case 3:
                case 4:
                    this.gameState = GameState.CLOSED;
                    break;
            }

            if (this.gameState == GameState.CASHOUT) {
                this.betActions.forEach((element) => {
                        element.cssClasses['disabled'] = false;
                        element.cssClasses['EnablePointers'] = false;
                });
            }
            
            if (this.gameState == GameState.OPEN) {
                this.AviatorLUckyPlayers = [];

                for (let i = 0; i < this.runnersCount; i++) {
                    if (this.betActions[i].betState === OrderState.SUBMITTED) {
                        this.ResetOrder(this.betActions[i].id);
                    }
                }

                this.betActions.forEach(function (element) {
                    if (element.title == "Next") {
                        element.title = "Place";
                    }

                    element.visible = true;
                });
            }

            if (this.gameState === GameState.CASHOUT) {
                this.Trace("Cash out phase started");

                this.betActions.forEach(function (element) {
                    if (element.title == "Place") {
                        element.title = "Next";
                    }

                    element.visible = true;
                });
            }

            if (this.betActions.length > 0) {
                if (this.gameState === GameState.CLOSED) {
                    for (let i = 0; i < this.runnersCount; i++) {
                        if (this.betActions[i].betState === OrderState.SUBMITTED) {
                            this.ResetOrder(this.betActions[i].id);
                        }
                    }
                    this.SetFunFact();
                }
            }

            this.Trace("Ch status: " + newVal.state);

            this.UpdateAviatorAnimation(newVal.state);
        },
        crashGamePrice: function (newVal, oldVal) {

            for (let i = 0; i < this.runnersCount; i++) {
                if (this.betActions[i].autoCashout &&
                    newVal >= this.betActions[i].autoCashoutPrice &&
                    this.betActions[i].betState == OrderState.SUBMITTED) {
                    this.Cashout(this.betActions[i].id);
                    this.Trace("Auto cashout triggered # " + this.betActions[i].id);
                }
            }
        }
    },
    methods: {
        SetCrashGamePrice: function (priceData) {
            this.UpdateCrashGamePrice(priceData.price);
            this.UpdateRunnersWinloss();
        },
        UpdateCrashGamePrice: function (price) {
            this.crashGamePrice = parseFloat(price);
        },
        UpdateRunnersWinloss: function () {
            for (let i = 0; i < this.runnersCount; i++) {
                if (this.betActions[i].betState === OrderState.SUBMITTED) {
                    this.betActions[i].winloseamount = ((this.betActions[i].betSize * parseFloat(this.crashGamePrice)) - this.betActions[i].betSize).toFixed();

                    //if (this.gameId.toString()== "9023")
                    //{
                    //    if (this.betActions[i].isPartialCashoutDisabled) {
                    //        this.betActions[i].winloseamount = (this.betActions[i].winloseamount / 2).toFixed();
                    //    } else {
                    //        this.betActions[i].BlastPwinloseamount = (this.betActions[i].winloseamount / 2).toFixed();
                    //    }
                    //}
                }
            }
        },
        BetAction: function (key, selId) {
            if (key == "bet") {
                this.EnqueueOrder(selId);
            }
            else if (key == "cancel") {
                this.CancelOrder(selId);
            }
            else if (key == "cashout") {
                    this.Cashout(selId);
            }
        },

        EnqueueOrder: function (selectionId) {

            let rn = this.betActions.find(x => x.id === selectionId)

            rn.betState = OrderState.QUEUED;
            rn.title = "Cancel";
            rn.action = "cancel";
            rn.cssClasses['btn-success'] = false;
            rn.cssClasses['btn-info'] = true;
        },
        CancelOrder: function (selectionId) {

            let rn = this.betActions.find(x => x.id === selectionId);
            rn.betState = OrderState.EMPTY;
            rn.title = "Next";
            rn.action = "bet";
            rn.cssClasses['btn-success'] = true;
            rn.cssClasses['btn-info'] = false;
        },
        ResetOrder: function (selId) {
            const self = this;

            let rn = this.betActions.find(x => x.id === selId);
            rn.winloseamount = 0;
            rn.betState = OrderState.EMPTY;
            rn.isPartialCashoutDisabled = false;
            rn.BlastPwinloseamount = 0;
            rn.title = "Next";
            rn.action = "bet";
            rn.cssClasses['btn-success'] = true;
            rn.cssClasses['btn-info'] = false;
            rn.cssClasses['btn-warning'] = false;
            rn.cssClasses['disabled'] = false;
            rn.cssClasses['EnablePointers'] = false;

            window.removeEventListener("beforeunload", self.BeforeUnloadHandler);
        },
        SubmitOrder: function (selectionId) {
            const self = this;

            let rn = this.betActions.find(x => x.id === selectionId);

            if (rn != null) {
                rn.betState = OrderState.SUBMITTED;
                rn.title = "Cashout";
                rn.action = "cashout";
                rn.cssClasses['btn-success'] = false;
                rn.cssClasses['btn-info'] = false;
                rn.cssClasses['btn-warning'] = true;

                if (self.timeLeft > 0) {
                    rn.cssClasses['disabled'] = true;
                    rn.cssClasses['EnablePointers'] = true;
                } else {
                    rn.cssClasses['disabled'] = false;
                    rn.cssClasses['EnablePointers'] = false;
                }
            }
        },
        SubmitOrders: function () {
            if (!this.isOrderEnqueued) {
                return;
            }

            const self = this;

            var qs = '/api/v2/Orders/game/rb/' + this.gameId.toString();

            for (let i = 0; i < this.runnersCount; i++) {
                if (this.betActions[i].betState === OrderState.QUEUED) {
                    this.betActions[i].betState = OrderState.PROCESSING;
                }
            }

            let orders = self.CreateOrders();

            if (orders.length === 0) {
                this.ResetOrder(1);
                this.ResetOrder(2);
                return;
            }

            let dataToSend = orders;
            
            $.ajax({
                type: "POST",
                url: qs,
                data: JSON.stringify(dataToSend),
                contentType: "application/json; charset=utf-8",
                success: function (result) {

                    window.addEventListener("beforeunload", self.BeforeUnloadHandler);

                    let successOrders = 0;
                    if (self.gameId.toString()== "9023") {
                        ++successOrders;
                        self.SubmitOrder(result.selectionId);
                    }
                    else
                    {
                        for (const element of result) {
                            if (!element.success) {
                                let msg = "Order #" + element.orderRequest.selectionId + " failed: " + element.message;
                                self.Toastertoshow(msg, 2);

                                self.ResetOrder(element.orderRequest.selectionId);

                            }
                            else {
                                ++successOrders;

                                self.SubmitOrder(element.order.selectionId);
                            }
                        }
                    }
                    if (successOrders > 0) {
                        let msg = successOrders + " orders placed";
                        self.Toastertoshow(msg, 1);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error(errorThrown);
                    if (errorThrown == 'Unauthorized') {
                        self.Toastertoshow(errorThrown + ' Login Again', 2);
                        setTimeout(() => {
                            location.reload();
                        }, 2000);

                    } else {
                        if (jqXHR.responseJSON && jqXHR.responseJSON.title) {
                            self.Toastertoshow(jqXHR.responseJSON.title, 2);
                        }
                    }

                    for (let i = 0; i < self.runnersCount; i++) {
                        if (self.betActions[i].betState === OrderState.SUBMITTED || self.betActions[i].betState === OrderState.PROCESSING) {
                            self.ResetOrder(self.betActions[i].id);
                        }
                    }
                },
                complete: function (jqXHR, textStatus) {

                }
            });
        },
        EnableCashout: function (orders) {
            const self = this;

            for (const element of orders) {
                self.SubmitOrder(element.selection);
            }
        },
        Cashout: function (selectionId) {
            var self = this;
            const cashoutRequest = {
                GameId: this.gameId.toString(),
                MarketId: this.currentMarketId,
                Price: this.crashGamePrice,
                SelectionId: parseInt(selectionId),
                IsPartial: false
            };

            self.wscRBC.invoke("CashOut", cashoutRequest);
        },
        CashoutPartial: function (selectionId) {
            var self = this;
            const cashoutRequest = {
                GameId: this.gameId.toString(),
                MarketId: this.currentMarketId,
                Price: this.crashGamePrice,
                SelectionId: parseInt(selectionId),
                IsPartial: true
            };
            self.wscRBC.invoke("CashOut", cashoutRequest);
            
        },
        CashoutAck: function (data) {
            if (data.isPartial) {
                this.betActions[0].isPartialCashoutDisabled = true;
            } else {
                this.ResetOrder(data.selectionId);
            }
        },
        CreateOrders: function () {
            let orders = [];

            for (let i = 0; i < this.runnersCount; i++) {
                if (this.betActions[i].betState !== OrderState.PROCESSING) {
                    continue;
                }

                let o = this.CreateOrder(this.betActions[i].id);
                if (o != null) {
                    orders.push(o);
                }
            }

            return orders;
        },
        CreateOrder: function (selectionId) {
            let betSize = this.betActions[selectionId - 1].betSize;

            if (betSize == undefined || betSize == '') {
                return null;
            }

            let order = {
                price: 1,
                side: "b",
                marketId: this.currentMarketId,
                channelId: this.gameId.toString(),
                identity: GetDeviceIdentity(),
                selection: selectionId,
                clientSeed: this.clientSeed,
                size: parseInt(betSize)
            };

            return order;
        },
        hasOrderInQueue: function (selectionId) {
            return this.betActions.find(x => x.id === selectionId).betState === OrderState.QUEUED;
        },
        hasSubmittedOrder: function (selectionId) {
            return this.betActions.find(x => x.id === selectionId).betState === OrderState.SUBMITTED;
        },
        isCashoutAvailable: function (selectionId) {
            return this.gameState === GameState.CASHOUT &&
                this.hasSubmittedOrder(selectionId);
        },
        AutoBetSlider: function (id) {
            this[`isAutoBet${id}`] = !this[`isAutoBet${id}`];
        },
        sliderBarVisibility: function (id) {
            var sliderDiv = document.getElementById("sliderDiv" + id);
            this[`isAutoCashout${id}`] = !this[`isAutoCashout${id}`];
            if (document.getElementById("switch2" + id).checked) {
                isAutoCashout = true;
                sliderDiv.style.display = "block";
            } else {
                isAutoCashout = false;
                sliderDiv.style.display = "none";
            }
        },
        updateSliderValue: function (id) {
            //var slider = document.getElementById("slider" + id);
            //var sliderValue = document.getElementById("sliderValue" + id);
            //sliderValue.innerText = slider.value;
        },
        getAutoCashoutPrice: function (id) {
            return this[`autoCashoutPrice${id}`];
        },
        getrunnersize: function (id) {
            return this[`BetSize${id}`];
        },
        setAutoCashoutPrice: function (id, value) {
            let parsedValue = parseFloat(value);
            if (parsedValue < 50) {
                parsedValue = parsedValue + 0.01; // Increase slowly below 10
            }
            parsedValue = parseFloat(parsedValue.toFixed(2));
            this.$set(this, `autoCashoutPrice${id}`, parseFloat(parsedValue));
        },
        handleManualInput: function (id, value) {
            let parsedValue = parseFloat(value);
            if (!isNaN(parsedValue)) {
                parsedValue = parseFloat(parsedValue.toFixed(2));
                this.$set(this, `autoCashoutPrice${id}`, parseFloat(parsedValue));
            }
        },
        handleManualSizes: function (id, value) {
            this.$set(this, `BetSize${id}`, parseInt(value));
        },
        handleManualSizesinc: function (id, value) {
            let parsed = this[`BetSize${id}`];
            parsed = parsed + parseInt(value)
            this.$set(this, `BetSize${id}`, parseInt(parsed));
        },
        GetClientSeed: function () {
            const seeds = new Uint32Array(1);
            window.crypto.getRandomValues(seeds);
            return seeds[0];
        },
        IncrementPrice: function (selectionId) {
            this.betActions[selectionId - 1].autoCashoutPrice =
                +(parseFloat(this.betActions[selectionId - 1].autoCashoutPrice) + 0.01).toFixed(2);
        },
        DecrementPrice: function (selectionId) {
            let rn = this.betActions.find(x => x.id === selectionId);
            if (rn.autoCashoutPrice > 1.1) {
                rn.autoCashoutPrice = +(rn.autoCashoutPrice - 0.01).toFixed(2);
            }
        },
        IncrementSize: function (selectionId, amount) {
            let rn = this.betActions.find(x => x.id === selectionId);

            rn.betSize = parseInt(rn.betSize) + parseInt(amount);
        },
        SetSize: function (selectionId, amount) {
            let rn = this.betActions.find(x => x.id === selectionId);

            rn.betSize = parseInt(amount);
        },
        DecrementSize: function (selectionId, amount) {
            let rn = this.betActions.find(x => x.id === selectionId);

            if (rn.betSize - amount > 0) {
                rn.betSize -= amount;
            }
        },
        UpdateLuckyPlayers: function (data) {
            let self = this;

            data.size = +(data.size / self.currencyRate).toFixed(2);
            data.winLose = +(data.winLose / self.currencyRate).toFixed(2);

            if (data.price === 0 && data.winLose === 0) {
                self.AviatorLUckyPlayers.push(data);
                self.SortCommunityOrders();
            } else {
                let m = _.find(self.AviatorLUckyPlayers, function (item) {
                    return item.userId === data.userId && item.size == data.size && item.winLose == 0;
                });
                if (m !== null && m !== undefined) {
                    m.price = data.price;
                    m.size = data.size;
                    m.winLose = data.winLose;
                }
            }
        },
        SortCommunityOrders: function () {
            this.AviatorLUckyPlayers.sort((x, y) => y.size - x.size);

            // uniq usernames
            let usernames = _.uniq(this.AviatorLUckyPlayers.map(x => x.username));

            // loop over AviatorLuckyPlayers and set rank
            for (let i = 0; i < this.AviatorLUckyPlayers.length; i++) {
                this.AviatorLUckyPlayers[i].rank = usernames.indexOf(this.AviatorLUckyPlayers[i].username) + 1;
            }

            this.AviatorLUckyPlayers.sort((x, y) => x.rank - y.rank);
        },
        IncrementPriceCont: function (selectionId, event) {
            if (event) {
                event.preventDefault();
            }

            let self = this;

            self.IncrementPrice(selectionId);

            if (self.autoPriceIntvl != null) {
                clearInterval(self.autoPriceIntvl);
            }

            self.autoPriceIntvl = setInterval(() => {
                let rn = self.betActions.find(x => x.id === selectionId);
                rn.autoCashoutPrice = +(rn.autoCashoutPrice + 0.01).toFixed(2);
            }, 100);
        },
        validateInput: function (rnr) {
            if (rnr.autoCashoutPrice === '' || rnr.autoCashoutPrice >= 1.10) {
                return; 
            }
        },
        validateMinValue: function (rnr) {
            if (rnr.autoCashoutPrice === '' || rnr.autoCashoutPrice < 1.10) {
                rnr.autoCashoutPrice = 1.10; // Set to minimum if empty or below minimum
            }
        },
        StopPriceIncrement: function () {
            clearInterval(this.autoPriceIntvl);
        },
        DecrementPriceCont: function (selectionId, event) {
            if (event) {
                event.preventDefault()
            }

            let self = this;

            self.DecrementPrice(selectionId);

            self.autoPriceIntvl = setInterval(() => {
                let rn = self.betActions.find(x => x.id === selectionId);
                if (rn.autoCashoutPrice <= 1.1) {
                    clearInterval(self.autoPriceIntvl);
                }
                else {
                    rn.autoCashoutPrice = +(rn.autoCashoutPrice - 0.01).toFixed(2);
                }
            }, 100);
        },
        ImagesLoaded: function () {
            this.UpdateAviatorAnimation(this.snapshot.state);
        },
        UpdateAviatorAnimation: function (LatestState) {
            if (this.gameId.toString()== 777701) {
                if (LatestState == 1) {
                    this.resetPlaneToStart();
                }
                if (LatestState == 2) {
                    this.startAnimation();
                }
                if (LatestState == 3 || LatestState == 4) {
                    this.crashPlane();
                    if (LatestState == 3) {
                        if (!isBgMuted) {
                            const crashSound = document.getElementById('crashSound');
                            if (crashSound && crashSound.paused && !document.hidden) {
                                crashSound.volume = 0.4;
                                crashSound.play().catch(error => {
                                    console.error('Error playing the Crash audio:', error);
                                });
                            }
                        }
                    }
                }
            }
        },
        PingTest: function () {
            var self = this;
            this.pingTime = new Date().getTime();
            if (self.wscRBC != null && self.wscRBC.state === signalR.HubConnectionState.Connected) {
                self.wscRBC.invoke("Ping");
            }
        },
        Pong: function () {
            this.latency = new Date().getTime() - this.pingTime;
            
            let strength = this.latency;
            const bars = document.querySelectorAll('.AVI-icon__signal-strength span');
            let barsToFill;
            if (strength >= 0 && strength <= 200) {
                barsToFill = 4;
            } else if (strength > 200 && strength <= 400) {
                barsToFill = 3;
            } else if (strength > 400 && strength <= 800) {
                barsToFill = 2; 
            } else {
                barsToFill = 1; 
            }
            bars.forEach((bar, index) => {
                if (index < barsToFill) {
                    if (barsToFill <= 2) {
                        bar.style.backgroundColor = '#FF0000'; 
                    } else {
                        bar.style.backgroundColor = '#00FF00';
                    }
                } else {
                    bar.style.backgroundColor = '#ccc'; 
                }
            });
        },
        SetFunFact: function () {
            const stringsArray = [
                "Sometimes you lose, sometimes you win. Try again!",
                "A player cashed out 4.5 lakhs from a single bet.",
                "The best day to play is.. Every day!" ,
                "The highest consecutive days played by a player is 12." ,
                "Chances of winning are high when you play more." ,
                "The average bet per round is 500." ,
                "Inviting your friend doubles your combined chances of winning." 
            ];

            const randomIndex = Math.floor(Math.random() * stringsArray.length);
            const selectedString = stringsArray[randomIndex];
            this.funfactvalue = selectedString;
        },
        getPlaneDimensions: function () {
            const baseWidth = canvas.width * 0.14;
            const baseHeight = canvas.height * 0.18;
            if (window.innerWidth < 768) {
                return { width: baseWidth * 1.8, height: baseHeight * 1.8 };
            }
            return { width: baseWidth, height: baseHeight };
        },
        
        /*NEW CODE STARTS HERE*/
        resizeCanvas: function () {
            try {
                canvas = document.getElementById('animationCanvas');
                ctx = canvas.getContext('2d');
                planeGif = document.getElementById('planeGif');
                const container = document.querySelector('.scroll-containeraviator');
                if (container) {
                    canvas.width = container.clientWidth;
                    canvas.height = container.clientHeight;
                }
                this.cloudOffset = 0;
                this.bottomLineOffset = 0;
                this.leftLineOffset = 0;
                this.updatePlaneStartPosition();
                this.drawStaticScene();
            } catch (error) {
                setTimeout(() => this.resizeCanvas(), 1000);
            }
        },
        updatePlaneStartPosition: function () {
            const { height: planeHeight } = this.getPlaneDimensions();
            const mobileHorizontalOffset = window.innerWidth < 768 ? 20 : 0;

            planeStartX = 0.1 * canvas.width + mobileHorizontalOffset;
            planeStopX = canvas.width * 0.8;

            if (window.innerWidth < 768) {
                planeEndY = canvas.height * 0.4;
                planeStopX = canvas.width * 0.8;
                planeStartY = canvas.height - planeHeight + 40;
            } else {
                planeEndY = canvas.height / 3;
                planeStartY = canvas.height - planeHeight + 50;
            }

            currentX = planeStartX;
            currentY = planeStartY;

            this.updatePlaneGifPosition();
        },
        startAnimation: function () {
            if (!canvas || !planeGif) {
                return;
            }
            if (animationId !== undefined && animationId) {
                return;
            }
            startTime = null;
            reachedCenter = false;
            isCrashed = false;
            planeGif.style.display = "block";
            cancelAnimationFrame(animationId);
            animationId = requestAnimationFrame(this.animate);
        },
        drawDynamicLines: function (progress, oscillatingOffsetY, oscillatingOffsetX) {
            if (isCrashed) return;

            const planeWidth = canvas.width * 0.1;
            const planeHeight = canvas.height * 0.1;

            // ✅ Ensure plane starts from **EXACT** bottom-left corner
            currentX = planeStartX + (planeStopX - planeStartX) * progress - planeWidth / 2 + oscillatingOffsetX;
            currentY = (planeStartY - (planeStartY - planeEndY) * Math.pow(progress, 2)) + oscillatingOffsetY + planeHeight / 2;

            // ✅ Adjust control points to avoid steep upward movement
            const controlX = (planeStartX + currentX) / 2;
            const controlY = planeStartY + planeHeight / 2 + 2;

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, canvas.width, canvas.height + 25);
            ctx.clip();

            // ✅ **Fix filled curve area to start from bottom-left perfectly**
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, "rgba(128, 0, 128, 0.2)");
            gradient.addColorStop(1, "rgba(128, 0, 128, 0.2)");

            ctx.beginPath();
            ctx.moveTo(0, canvas.height); // **Ensures curve starts from exact bottom**
            ctx.quadraticCurveTo(controlX, controlY, currentX, currentY);
            ctx.lineTo(currentX, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // ✅ **Fix the Purple Curve**
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            ctx.quadraticCurveTo(controlX, controlY, currentX, currentY);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(170, 100, 255, 0.8)'; // Soft glowing purple
            ctx.stroke();
            ctx.closePath();

            ctx.restore();
        },
        animate: function (timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration * 2, 1);

            this.drawPlane(progress, elapsed);

            if ((progress < 1 || reachedCenter) && !isCrashed) {
                animationId = requestAnimationFrame(this.animate);
            } else if (isCrashed) {
                animationId = requestAnimationFrame(this.animate);
            }
        },
        drawPlane: function (progress, elapsedTime) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let oscillatingOffsetY = 0;
            let oscillatingOffsetX = 0;

            if (progress >= 1) {
                reachedCenter = true;
            }
            if (this.snapshot.state == 3 || this.snapshot.state == 4) {
                isCrashed = true;
            }
            if (reachedCenter && !isCrashed) {
                const oscillationAmplitude = canvas.height * 0.1;
                const oscillationSpeed = 0.001;
                const transitionDuration = 2000;
                const oscillationStartTime = Math.max(elapsedTime - (duration / 2), 0);
                const easeFactor = Math.min(oscillationStartTime / transitionDuration, 1);
                const effectiveAmplitude = oscillationAmplitude * easeFactor;

                oscillatingOffsetY = effectiveAmplitude * Math.sin(oscillationSpeed * elapsedTime);
                oscillatingOffsetX = (oscillatingOffsetY < 0 ? -1 : 1) * Math.abs(oscillatingOffsetY * 1.5);
            }
            this.drawDynamicLines(progress, oscillatingOffsetY, oscillatingOffsetX);
            this.drawScrollingClouds();
            this.drawScrollingBackgroundLines();
            this.drawstars();
            
            if (isCrashed) {
                currentX += canvas.width * 0.01;
                currentY -= canvas.height * 0.01;
                if (currentX > canvas.width || currentY < -planeGif.offsetHeight) {
                    planeGif.style.display = "none";
                    cancelAnimationFrame(animationId);
                    return;
                }
            }
            else {
                const planeWidth = canvas.width * 0.1;
                const planeHeight = canvas.height * 0.1;
                currentX = planeStartX + (planeStopX - planeStartX) * progress - planeWidth / 2 + oscillatingOffsetX;
                currentY = (planeStartY - (planeStartY - planeEndY) * Math.pow(progress, 2)) + oscillatingOffsetY + planeHeight / 1.3;
            }
            

            planeGif.style.display = "block";
            this.updatePlaneGifPosition();
        },
        drawScrollingClouds: function () {
            if (!this.cloudImage) {
                this.cloudImage = new Image();
                this.cloudImage.src = '/img/RBC/Clouds.svg';
                this.cloudImage.onload = () => this.drawScrollingClouds();
                return;
            }
            if (!this.stars) {
                this.stars = new Image();
                this.stars.src = '/img/RBC/stars.png';
                this.stars.onload = () => this.drawScrollingClouds();
                return;
            }

            const cloudWidth = canvas.width * 0.5; // Ensure default if not loaded
            const cloudHeight = canvas.height * 0.25; // Increase height for full effect
            const cloudY = canvas.height - cloudHeight; // Position at bottom

            // Ensure seamless scrolling effect
            this.cloudOffset -= 1;
            if (this.cloudOffset <= -cloudWidth) {
                this.cloudOffset = 0;
            }

            // 🔹 **Ensure Full Width for Clouds**
            for (let i = 0; i < Math.ceil(canvas.width / cloudWidth) + 2; i++) {
                ctx.drawImage(this.cloudImage, this.cloudOffset + i * cloudWidth, cloudY, cloudWidth, cloudHeight);
            }
        },
        drawstars: function () {
            if (!this.stars) {
                this.stars = new Image();
                this.stars.src = '/img/RBC/stars.png';
                this.stars.onload = () => this.drawstars(); // Re-call function after image loads
                return;
            }

            // Set the width and height to match the image or canvas width proportionally
            const starsWidth = canvas.width; // Full width of the canvas
            const starsHeight = canvas.height * 0.4; // Adjust height to fit at the top
            const starsY = 0; // Position at the very top

            // Draw the stars image at the top of the canvas
            ctx.drawImage(this.stars, 0, starsY, starsWidth, starsHeight);
        },
        drawScrollingBackgroundLines: function () {
            if (!this.bottomLineImage) {
                this.bottomLineImage = new Image();
                this.bottomLineImage.src = '/img/RBC/Bottomlines.svg';
                this.bottomLineImage.onload = () => this.drawScrollingBackgroundLines();
                return;
            }
            if (!this.leftLineImage) {
                this.leftLineImage = new Image();
                this.leftLineImage.src = '/img/RBC/leftlines.svg';
                this.leftLineImage.onload = () => this.drawScrollingBackgroundLines();
                return;
            }

            const bottomLineWidth = this.bottomLineImage.naturalWidth || 300;
            const bottomLineHeight = this.bottomLineImage.naturalHeight || 50;
            const leftLineWidth = this.leftLineImage.naturalWidth || 50;
            const leftLineHeight = this.leftLineImage.naturalHeight || 300;

            // Adjust offsets for infinite scrolling
            this.bottomLineOffset -= 2;
            this.leftLineOffset -= 2;

            if (this.bottomLineOffset <= -bottomLineWidth) {
                this.bottomLineOffset = 0;
            }
            if (this.leftLineOffset <= -leftLineHeight) {
                this.leftLineOffset = 0;
            }

            // 🔹 **Ensure Full Width for Bottom Lines**
            for (let i = 0; i < Math.ceil(canvas.width / bottomLineWidth) + 2; i++) {
                ctx.drawImage(this.bottomLineImage, this.bottomLineOffset + i * bottomLineWidth, canvas.height - bottomLineHeight, bottomLineWidth, bottomLineHeight);
            }

            // 🔹 **Ensure Full Height for Left Lines**
            for (let j = 0; j < Math.ceil(canvas.height / leftLineHeight) + 2; j++) {
                ctx.drawImage(this.leftLineImage, 0, this.leftLineOffset + j * leftLineHeight, leftLineWidth, leftLineHeight);
            }
        },
        updatePlaneGifPosition: function () {
            const { width: planeWidth, height: planeHeight } = this.getPlaneDimensions();
            planeGif.style.left = `${currentX - planeWidth / 2}px`;
            planeGif.style.top = `${currentY - planeHeight}px`;
            planeGif.style.width = `${planeWidth}px`;
            planeGif.style.height = `${planeHeight}px`;
        },
        drawStaticScene: function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.drawScrollingClouds();
            this.drawScrollingBackgroundLines();
        },
        crashPlane: function () {
            isCrashed = true;
            planeGif.style.display = "none";
            startTime = performance.now();
        },
        resetPlaneToStart: function () {
            isCrashed = false;
            cancelAnimationFrame(animationId);
            this.updatePlaneStartPosition();
            planeGif.style.display = "none";
            animationId = null;
            this.drawStaticScene();
        },
        RunningCanvas: function () {
            this.startAnimation();
        }
    }
};


let bottomLineOffset = 0;
let leftLineOffset = 0;
let cloudOffset = 0;
let canvas = '' ;
let ctx = '';
let planeGif = '' ;
let animationId;
let isCrashed = false;
let reachedCenter = false;
let currentX, currentY;
let dotOffset = 0;
let verticalDotOffset = 0;
let rotationAngle = 0;
let planeStartX, planeStartY, planeStopX, planeEndY;
const duration = 5000;
let startTime;




const OrderState = {
    EMPTY: 0,
    QUEUED: 1,
    PROCESSING: 2,
    SUBMITTED: 3,
};

const GameState = {
    OPEN: 0,
    CASHOUT: 1,
    CLOSED: 2
};

Vue.filter('formatempty', function (value) {
    if (value === 0 || value === null || value === undefined || value == "--") return '';
    return value === '' ? null : numeral(value).format('0,0');
});

