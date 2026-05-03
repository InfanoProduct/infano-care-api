import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('ls -R /root/infano-dev/uploads', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '109.199.120.104',
  port: 22,
  username: 'root',
  password: 'B!6cCcvbPLhyH97'
});
