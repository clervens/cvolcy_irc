(function () {

    var server = io.connect(window.location.origin);
    var chat = {};
    var hp = new EnhanceText();
    hp.add_filters([
        'escape',
        [
            'image',
            {
                height: 150 //Size in pixel
            }
        ],
        [
            'youtube',
            {
                width: 600 //Size in pixel
            }
        ]
    ]);

    chat.insertMessage = function(data, isAuthor) {
        var author=(isAuthor) ? 'author' : 'guest';
        var $newMessage = $('<p class="' + author + '">' + hp.parse(data) + '</p>');
        $newMessage.prependTo('.user-messages')
    }

    chat.addChatter = function(data) {
        var $newChatter = $('<li>'+ data + '</li>')
                            .data('name', data);
        $newChatter.prependTo('.user-list')
    }

    chat.removeChatter = function(data) {
        var $users = $('.user-list li');
        $users.filter(function() {
            return $(this).data('name') == data
        }).remove()
    }

    chat.emitMessages = function(e) {
        if (e.which === 13 || e.which === 1) {
            e.preventDefault();
            // It Captures the message
            var message = $('.form-text').val();
            if (message != "") {
                chat.insertMessage(message, true)
                $('form')[0].reset();
                server.emit('messages', message)
            }
        }
    }

    server.on('connect', function(data) {
        nickname = prompt("What is your nickname?");
        server.emit('join', nickname)
        chat.addChatter(nickname)
    })

    server.on('add chatter', chat.addChatter)

    server.on('remove chatter', chat.removeChatter)

    server.on('messages', chat.insertMessage)

    $('.form-submit').on('click', chat.emitMessages)

    $('.form-text')
        .on('keypress', chat.emitMessages)
        .focus()

})();