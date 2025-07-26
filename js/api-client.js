/*! WebEx Api Client
 * 2019 BetPro
 */
class WebExApiClient {
    constructor(isNewApiVersion) {
        this.isNewApiVersion = isNewApiVersion;
    }

    Login(username, password, identity, callback, onerror) {

        var userModel = {
            username: username,
            password: password,
            identity: identity
        };

        $.ajax({
            type: "POST",
            url: '/api/Users/authenticate',
            data: JSON.stringify(userModel),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: callback,
            error: onerror
        });
    }

    async UpdateNav(id, data) {
        const response = await fetch("/api/manage/nav/" + id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        return response.json();
    }

    async DeleteNav(id) {
        const response = await fetch("/api/manage/nav/" + id, { method: 'DELETE' });
        return response.json();
    }

    AddNavEntries(data) {
        return $.ajax({
            url: '/api/manage',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            dataType: 'json'
        });
    }

    async ListOrders(eventId, marketId, maxRows) {
        const params = new URLSearchParams({
            eventId: eventId,
            marketId: marketId,
            maxResults: maxRows
        });

        var token = getCookie('wex3authtoken');

        var url = ordersUrl;
        if (this.isNewApiVersion) {
            url += "/v2";
        }
        
        url += '/orders/event?' + params.toString()


        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });

        return response.json();
    }

    async PostOrder(order) {
        var token = getCookie('wex3authtoken');

        var url = ordersUrl + '/orders';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(order)
        });

        return response.json();
    }

    async DeleteOrder(orderId) {
        var token = getCookie('wex3authtoken');

        var url = ordersUrl + '/orders/' + orderId;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });

        return response.json();
    }

    async DeleteOrders(marketId) {
        var token = getCookie('wex3authtoken');

        var url = ordersUrl + '/orders/CancelAll?MarketId=' + marketId;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });

        return response.json();
    }
}

clientEx = new WebExApiClient(false);