import { SQLServerDataProvider } from './SQLServerDataProvider';
import { DataApi, DataApiResponse, DataApiError, DataApiSettings } from './DataApi';
import { Entity } from './../utils';
import * as express from 'express';
import * as bodyParser from 'body-parser';

export class ExpressBridge {

  constructor(private app: express.Express, private rootUrl: string = '') {
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(function (req, res, next) {

      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Origin", req.header('origin'));
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");

      next();
    });
  }
  addSqlDevHelpers(server: SQLServerDataProvider) {

    let r = this.rootUrl + '/sqlHelper/typescript/:tableName';
    console.log(r);
    this.app.route(r).get(
      async (req, res) => {
        let s = await server.getTypeScript(req.params.tableName);
        res.type('text/plain');
        res.send(s);
      });
    r = this.rootUrl + '/sqlHelper/tables';
    console.log(r);
    this.app.route(r).get(
      async (req, res) => {
        server.listOfTables(new ExpressResponseBridgeToDataApiResponse(res), {
          get: key => {
            return req.query[key]
          }
        });
      });
  }
  add<T extends Entity<any>>(entity: T, options?: DataApiSettings<T>) {
    let api = new DataApi(entity, options);
    let myRoute = entity.__getName();
    myRoute = this.rootUrl + '/' + myRoute;
    console.log(myRoute);
    this.app.route(myRoute).get((req, res) => {

      api.getArray(new ExpressResponseBridgeToDataApiResponse(res), {
        get: key => {
          return req.query[key]
        }
      });
    }).post(async (req, res) => {
      api.post(new ExpressResponseBridgeToDataApiResponse(res), req.body);
    });
    this.app.route(myRoute + '/:id').get((req, res) => {
      api.get(new ExpressResponseBridgeToDataApiResponse(res), req.params.id);
    }).put(async (req, res) => {
      api.put(new ExpressResponseBridgeToDataApiResponse(res), req.params.id, req.body);
    }).delete(async (req, res) => {
      api.delete(new ExpressResponseBridgeToDataApiResponse(res), req.params.id);
    });


  }
}
class ExpressResponseBridgeToDataApiResponse implements DataApiResponse {
  constructor(private r: express.Response) {

  }

  public success(data: any): void {
    this.r.json(data);
  }

  public notFound(): void {
    this.r.sendStatus(404);
  }

  public error(data: DataApiError): void {
    if (data instanceof TypeError) {
      data = { message: data.message + '\n' + data.stack };
    }
    this.r.status(500).json(data);
  }
}