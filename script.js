const socket = io('http://localhost:3000')
const messageContainer = document.getElementById('message-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
let allUsers = {};
socket.on('chat-message', data => {
  appendMessage(`${data.name}: ${data.message}`)
})

let tempName = '';
socket.on('get-connected-users', users => {
  appendUser(users)
  let unOrderList = document.getElementById('users-list')
  let sltUsr =  document.getElementById('selected-user')
  unOrderList.childNodes.forEach(e => {
    e.addEventListener('click', () => {
      document.getElementById('message-container').innerHTML = ''
      document.getElementById('message-container').appendChild(sltUsr)
      let tempDesc = document.getElementById('message-container').appendChild(document.createElement('p'))
      tempDesc.setAttribute('id', 'selected-desc')
      tempDesc.innerText = `Your Chats with this ${e.innerText} will be end to end encrypted`
      console.log(e.innerText); 
      alert(`User ${e.innerText} is successfully Selected now your message with ${e.innerText} will be end to end encrypted`)
      tempName = e.innerText;
      sltUsr.innerText = tempName;
    })
  })
})

socket.on('private-message', async({ content, from }) => {
  console.log('Private message from ', from)
  await decryptData(content)
})
 
// const userName = document.getElementById('userName')
messageForm.addEventListener('submit', e => {
  e.preventDefault()
  if (tempName === '') {
    const message = messageInput.value
    appendMessage(`You: ${message}`)
    socket.emit('send-chat-message', localStorage.getItem('userName'), message)
    messageInput.value = ''
  }
  else {
    const message = messageInput.value
    encryptMessage(message , allUsers[tempName][1])   
    appendMessage(`You: ${message}`)
    messageInput.value = ''
  }
})

function appendMessage(message) {
  const messageElement = document.createElement('div')
  messageElement.innerText = message
  messageContainer.append(messageElement)
}

let tempAllUsersData = [];

function appendUser(users) { 
  allUsers = users;
  const keys = Object.keys(users)
  const ul = document.getElementById('users-list')
  ul.innerHTML = '';
  keys.forEach((key, index) => {
    const userElement = document.createElement('li')
    userElement.innerText = key
    tempAllUsersData.push(users[key])
    userElement.setAttribute('id', 'user-li')
    ul.append(userElement)
  })
}


if (!localStorage.getItem("publicKey") || !localStorage.getItem("privateKey") || !localStorage.getItem("userName")) {
  generateKeyPair().then((kp) => {
    keyPair = kp;
    exportKey(kp.publicKey, "spki");
    exportKey(kp.privateKey, "pkcs8");
  });
  const userName = prompt('What is your name ?')
  document.getElementById('user-title').innerText = userName;
  localStorage.setItem("userName", userName);
  socket.emit('new-user', userName, localStorage.getItem("publicKey"));
}
else {
  const userName = localStorage.getItem("userName");
  document.getElementById('user-title').innerText = userName;
  socket.emit('new-user', userName, localStorage.getItem("publicKey"));
}

function generateKeyPair() {
  return window.crypto.subtle
    .generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    )
    .then((keyPair) => {
      console.log("Key pair generated:", keyPair);
      return keyPair;
    })
    .catch((error) => console.error("Key pair generation error:", error));
}

function exportKey(key, format) {
  return window.crypto.subtle.exportKey(format, key).then((rawKeyData) => {
    const exportedKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(rawKeyData))
    );
    if (localStorage.getItem("publicKey") == null || localStorage.getItem("privateKey") == null) {
      if (format === "spki") {
        localStorage.setItem("publicKey", exportedKeyBase64);
      } else if (format === "pkcs8") {
        localStorage.setItem("privateKey", exportedKeyBase64);
      }
    }
  });
}

async function decryptData(msg) {
  const encryptedDataAsBase64 = msg;
  const privateKeyInBase64 = localStorage.getItem("privateKey");

  // Convert the private key from base64 to an ArrayBuffer
  const privateKeyArrayBuffer = new Uint8Array(
    atob(privateKeyInBase64).split("").map((char) => char.charCodeAt(0))
  );

  // Import the private key
  window.crypto.subtle
    .importKey(
      "pkcs8",
      privateKeyArrayBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    )
    .then((privateKey) => {
      // Decode the base64-encoded encrypted data
      const encryptedDataArrayBuffer = new Uint8Array(
        atob(encryptedDataAsBase64)
          .split("")
          .map((char) => char.charCodeAt(0))
      );

      // Decrypt the data using the private key 
      window.crypto.subtle 
        .decrypt( 
          { 
            name: "RSA-OAEP", 
          }, 
          privateKey, 
          encryptedDataArrayBuffer 
        ) 
        .then((decryptedData) => { 
          // Decode the decrypted data as text 
          const decryptedText = new TextDecoder().decode(decryptedData); 
          appendMessage(`Private Message from : ${tempName} : ${decryptedText}`) 
        }) 
        .catch((error) => console.error("Decryption error:", error)); 
    }) 
    .catch((error) => console.error("Key import error:", error)); 

}

////////////////////////////////////////////////////##################################################################


let keyPair = ''; // Global variable to store the key pair

function encryptMessage(message, remotePublicKey) {
  if (message == "") return;
  const msg = message;


  if (remotePublicKey != "") {
    const dataToEncrypt = msg;
    console.log({ remotePublicKey });
    const publicKey = atob(remotePublicKey);
    const encryptedpublicKeyArrayBuffer = new Uint8Array(
      publicKey.split("").map((char) => char.charCodeAt(0))
    );
    window.crypto.subtle
      .importKey(
        "spki",
        encryptedpublicKeyArrayBuffer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["encrypt"]
      )
      .then((key) => {
        window.crypto.subtle
          .encrypt(
            {
              name: "RSA-OAEP",
            },
            key,
            new TextEncoder().encode(dataToEncrypt)
          )
          .then((encryptedData) => {
            const encryptedDataAsBase64 = btoa(
              String.fromCharCode(...new Uint8Array(encryptedData))
            ); 
            socket.emit('send-private-message',  localStorage.getItem("userName") , encryptedDataAsBase64, tempName )
          })
          .catch((error) => console.error("Encryption error:", error));
      });
  } else {
    console.warn(
      "Remote public of the user is not available. Please try again later."
    );
  }  
}
