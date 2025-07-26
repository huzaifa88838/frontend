const timerMixin = {
    data: function () {
        return {
            message: 'Hi Timer',
            timeLimit: 20,
            timePassed: 0,
            timeLeft: this.timeLimit,
            timerInterval: null,
            remainingPathColor: "green",
            isRunning: false
        }
    },
    methods: {
        OnTimesUp: function () {
            clearInterval(this.timerInterval);
        },
        SyncTimer: function (timeLimit, progress) {
            const self = this;
            let initialValue = timeLimit;
            if (timeLimit == 0) {
                self.timeLeft = 0;
                self.OnTimesUp();
                return;
            }



            if (progress > 0) {
                timeLimit = Math.round(timeLimit / (100 - progress) * 100);
            }


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
        setCircleDasharray: function () {
            const circleDasharray = `${(
                this.calculateTimeFraction() * 283
            ).toFixed(0)} 283`;

            var pathrem = document.getElementById("base-timer-path-remaining");
            if (pathrem != null && pathrem != undefined) {
                pathrem.setAttribute("stroke-dasharray", circleDasharray);
            }
        },
        setRemainingPathColor: function () {
            const WARNING_THRESHOLD = 10;
            const ALERT_THRESHOLD = 5;

            const COLOR_CODES = {
                info: {
                    color: "green"
                },
                warning: {
                    color: "orange",
                    threshold: WARNING_THRESHOLD
                },
                alert: {
                    color: "red",
                    threshold: ALERT_THRESHOLD
                }
            };
            const { alert, warning, info } = COLOR_CODES;
            var btp = document.getElementById("base-timer-path-remaining");
            if (btp != null && btp != undefined) {
                if (this.timeLeft <= alert.threshold) {

                    btp.classList.remove(warning.color);

                    btp.classList.add(alert.color);
                } else if (this.timeLeft <= warning.threshold) {

                    btp.classList.remove(info.color);

                    btp.classList.add(warning.color);
                } else {

                    btp.classList.remove(alert.color);

                    btp.classList.add(info.color);
                }
            }
        },
        calculateTimeFraction: function () {
            const rawTimeFraction = this.timeLeft / this.timeLimit;
            return rawTimeFraction - (1 / this.timeLimit) * (1 - rawTimeFraction);
        },
        formatTime: function (time) {
            const minutes = Math.floor(time / 60);
            let seconds = time % 60;

            if (seconds < 10) {
                seconds = `0${seconds}`;
            }

            return `${minutes}:${seconds}`;
        },
        reset: function () {
            this.timePassed = 0;
            this.timeLeft = this.timeLimit;

            this.setCircleDasharray();
            this.setRemainingPathColor(this.timeLeft);
        },
        ticktps: function (limit) {
            this.timeLeft = limit;
            this.setCircleDasharray();
            this.setRemainingPathColor(this.timeLeft);
        },
        tick: function (limit, progress) {
            let elapsed = Math.round(progress / 100 * limit);

            this.timeLimit = limit;
            this.timePassed = elapsed;
            this.timeLeft = limit - elapsed;

            this.setCircleDasharray();
            this.setRemainingPathColor(this.timeLeft);
        }
    }
}