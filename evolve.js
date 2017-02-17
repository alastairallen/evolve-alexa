require('request');
const request = require("request-promise");

module.exports = {
    login: function login(baseUrl, path, username, password, clientId) {
        var options = {
            url: baseUrl+path,
            form: {
                'username': username,
                'password': password,
                'client_id': clientId
            }
        };
        console.log('logon: '+baseUrl+path);
        return request.post(options);
    },

    getAppointments: function (baseUrl, path, searchTerm, token) {
        var options = {
            headers: {
                'Authorization' : 'Bearer ' + token,
                'Accept' : 'application/json+fhir',
                'Content-Type' : 'application/json+fhir'
            }
        };
        console.log('getAppointments: '+baseUrl+path+searchTerm);
        return request.get(baseUrl+path+searchTerm, options);
    }
}
