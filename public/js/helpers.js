async function request(type, url, data, async = true){
    return new Promise(function (resolve, reject) {
        data = data == null ? {} : data;
        var xhr = new XMLHttpRequest();
        xhr.open(type, url, async);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.send(JSON.stringify(data));

        xhr.onreadystatechange = (evt) => {
            if (evt.currentTarget.readyState === 4 && evt.currentTarget.status === 200) {
                try {
                    const response = JSON.parse(evt.currentTarget.response);
                    resolve(response);
                } catch (exception) {
                    reject(exception);
                }
            }
        };
    });
}
