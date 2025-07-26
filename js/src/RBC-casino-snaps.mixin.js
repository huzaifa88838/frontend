const SnapShotMixin = {
    data: function () {
        return {
            wscRBC: null,
            sToken: null
        }
    },
    created: function () {

    },
    computed: {
        isSignalRConnected: function () {
            return this.wscRBC !== null &&
                this.wscRBC.state === signalR.HubConnectionState.Connected;
        }
    },
    methods: {
        Connect: function () {
            const self = this;
            self.wscRBC = new signalR.HubConnectionBuilder()
                .withUrl(self.casinoUrl, {
                    accessTokenFactory: () => self.AccessTokenProvider()
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: retryContext => {
                        let maxTimeToAttemptingToReconnect = 1000 * 60 * 60;
                        if (retryContext.elapsedMilliseconds < maxTimeToAttemptingToReconnect) {
                            if (retryContext.previousRetryCount === 0) {
                                return 0;
                            } else if (retryContext.previousRetryCount === 1) {
                                return 2000;
                            } else if (retryContext.previousRetryCount < 10) {
                                return 5000;
                            } else {
                                return 10000;
                            }
                        } else {
                            return null;
                        }
                    }
                })
                .configureLogging(signalR.LogLevel.Error)
                .build();
            self.wscRBC.onreconnected(() => {
                self.SubscribeChannel();
            });
            self.wscRBC.on('ReceiveRBCnapshot', (data) => {
                self.SetSnapshot(data);
            });
            self.wscRBC.on('ReceiveShortResult', (data) => {
                self.RenderShortResults(data);
            });
            self.wscRBC.on('ReceiveCashoutNotification', (data) => {
                this.Toastertoshow(data.message, 1);
            });
            self.wscRBC.on('ReceiveCommunityOrder', (data) => {
                self.UpdateLuckyPlayers(data);
            });
            self.wscRBC.on('ReceiveTPSPrice', (data) => {
                self.SetCrashGamePrice(data);
            });
            self.wscRBC.on('ReceiveGroupMemberCount', (count) => {
                this.UpdateConnections(count);
            });

            self.wscRBC.on('Pong', () => {
                this.Pong();
            });

            self.wscRBC.on('ReceiveOrders', (Data) => {
                self.RenderOrders(Data);
            });

            self.wscRBC.on('CashoutAck', (data) => {
                self.CashoutAck(data);
            });

            this.StartSignalR();
        },
        DisconnectRbc: function () {
            if (this.wscRBC && this.wscRBC.state === signalR.HubConnectionState.Connected) {
                this.wscRBC.stop().then(() => {
                    const checkDisconnect = setInterval(() => {
                        if (this.wscRBC.state !== signalR.HubConnectionState.Connected) {
                            clearInterval(checkDisconnect);
                            console.log("Disconnected from the Streaming Service");
                        } else {
                            console.log("Waiting for disconnect...");
                        }
                    }, 500);
                }).catch((err) => {
                    setTimeout(() => self.DisconnectRbc(), 2000);
                });
            }
        },
        AccessTokenProvider: function () {
            return this.sToken;
        },
        StartSignalR: function () {
            if (this.wscRBC.state !== signalR.HubConnectionState.Disconnected) {
                return;
            }
            let self = this;
            this.wscRBC.start()
                .then(function () {
                    self.SubscribeChannel();
                })
                .catch(function (err) {
                    setTimeout(() => self.StartSignalR(), 3000);
                });
        },
        SubscribeChannel: function () {
            var self = this;
            self.wscRBC.invoke(
                "SubscribeRBCChannel", this.gameId.toString());
        },
        RenderOrders: function (data) {
            this.ExMatched = data.orders.reverse();
            this.positions = data.position;
            this.SetSignalRposition();

            this.EnableCashout(data.orders);
        },
        RenderShortResults: function (Results) {
            this.shortresults = Results;
        }
    }
}