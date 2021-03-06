const fs = require('fs-extra');
const Promise = require('bluebird');

module.exports = (shepherd) => {
  shepherd.log = (msg, isSpvOut) => {
    if (shepherd.appConfig.dev ||
        shepherd.appConfig.debug) {
      console.log(msg);
    }

    shepherd[!isSpvOut ? 'appRuntimeLog' : 'appRuntimeSPVLog'].push({
      time: Date.now(),
      msg: msg,
    });
  }

  shepherd.writeLog = (data) => {
    const logLocation = `${shepherd.agamaDir}/shepherd`;
    const timeFormatted = new Date(Date.now()).toLocaleString('en-US', { hour12: false });

    if (shepherd.appConfig.debug) {
      if (fs.existsSync(`${logLocation}/agamalog.txt`)) {
        fs.appendFile(`${logLocation}/agamalog.txt`, `${timeFormatted}  ${data}\r\n`, (err) => {
          if (err) {
            shepherd.log('error writing log file');
          }
        });
      } else {
        fs.writeFile(`${logLocation}/agamalog.txt`, `${timeFormatted}  ${data}\r\n`, (err) => {
          if (err) {
            shepherd.log('error writing log file');
          }
        });
      }
    }
  }

  shepherd.get('/log/runtime', (req, res, next) => {
    if (shepherd.checkToken(req.query.token)) {
      const successObj = {
        msg: 'success',
        result: req.query.spv && req.query.spv === 'true' ? shepherd.appRuntimeSPVLog : shepherd.appRuntimeLog,
      };

      res.end(JSON.stringify(successObj));
    } else {
      const errorObj = {
        msg: 'error',
        result: 'unauthorized access',
      };

      res.end(JSON.stringify(errorObj));
    }
  });

  shepherd.getAppRuntimeLog = () => {
    return new Promise((resolve, reject) => {
      resolve(shepherd.appRuntimeLog);
    });
  };

  /*
   *  type: POST
   *  params: payload
   */
  shepherd.post('/guilog', (req, res, next) => {
    if (shepherd.checkToken(req.body.token)) {
      const logLocation = `${shepherd.agamaDir}/shepherd`;
      const timestamp = req.body.timestamp;

      if (!shepherd.guiLog[shepherd.appSessionHash]) {
        shepherd.guiLog[shepherd.appSessionHash] = {};
      }

      if (shepherd.guiLog[shepherd.appSessionHash][timestamp]) {
        shepherd.guiLog[shepherd.appSessionHash][timestamp].status = req.body.status;
        shepherd.guiLog[shepherd.appSessionHash][timestamp].response = req.body.response;
      } else {
        shepherd.guiLog[shepherd.appSessionHash][timestamp] = {
          function: req.body.function,
          type: req.body.type,
          url: req.body.url,
          payload: req.body.payload,
          status: req.body.status,
        };
      }

      fs.writeFile(`${logLocation}/agamalog.json`, JSON.stringify(shepherd.guiLog), (err) => {
        if (err) {
          shepherd.writeLog('error writing gui log file');
        }

        const returnObj = {
          msg: 'success',
          result: 'gui log entry is added',
        };

        res.end(JSON.stringify(returnObj));
      });
    } else {
      const errorObj = {
        msg: 'error',
        result: 'unauthorized access',
      };

      res.end(JSON.stringify(errorObj));
    }
  });

  /*
   *  type: GET
   *  params: type
   */
  shepherd.get('/getlog', (req, res, next) => {
    if (shepherd.checkToken(req.query.token)) {
      const logExt = req.query.type === 'txt' ? 'txt' : 'json';

      if (fs.existsSync(`${shepherd.agamaDir}/shepherd/agamalog.${logExt}`)) {
        fs.readFile(`${shepherd.agamaDir}/shepherd/agamalog.${logExt}`, 'utf8', (err, data) => {
          if (err) {
            const errorObj = {
              msg: 'error',
              result: err,
            };

            res.end(JSON.stringify(errorObj));
          } else {
            const successObj = {
              msg: 'success',
              result: data ? JSON.parse(data) : '',
            };

            res.end(JSON.stringify(successObj));
          }
        });
      } else {
        const errorObj = {
          msg: 'error',
          result: `agama.${logExt} doesnt exist`,
        };

        res.end(JSON.stringify(errorObj));
      }
    } else {
      const errorObj = {
        msg: 'error',
        result: 'unauthorized access',
      };

      res.end(JSON.stringify(errorObj));
    }
  });

  shepherd.printDirs = () => {
    shepherd.log(`agama dir: ${shepherd.agamaDir}`);
    shepherd.log('--------------------------')
    shepherd.log(`komodo dir: ${shepherd.komododBin}`);
    shepherd.log(`komodo bin: ${shepherd.komodoDir}`);
    shepherd.writeLog(`agama dir: ${shepherd.agamaDir}`);
    shepherd.writeLog(`komodo dir: ${shepherd.komododBin}`);
    shepherd.writeLog(`komodo bin: ${shepherd.komodoDir}`);
  }

  return shepherd;
};