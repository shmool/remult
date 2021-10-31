import { Remult } from ".";
import { IntegerValueConverter } from "./valueConverters";
import { allEntities } from "./src/context";
import { getEntityKey } from "./src/remult3";
import { ExpressBridge } from "./server";
import { DataApi } from "./src/data-api";

export function remultGraphql(api:ExpressBridge) {
    let r = new Remult();
    let types = '';
    let query = '';
    let root = {};
    for (const e of allEntities) {
        let meta = r.repo(e).metadata;
        let fields = '';
        let filterFields = '';

        let key = getEntityKey(e);
        if (key) {
            for (const f of meta.fields) {
                {
                    let type = "String";
                    switch (f.valueType) {
                        case Boolean:
                            type = "Boolean";
                        case Number:
                            {
                                if (f.valueConverter === IntegerValueConverter)
                                    type = "Int";
                                else
                                    type = "Float";
                            }
                    }
                    fields += "\n\t" + f.key + ":" + type;
                    for (const operator of ["", "_ne"]) {
                        filterFields += "\n\t" + f.key + operator + ":" + type;
                    }
                    if (f.valueType === String || f.valueType === Number)
                        for (const operator of ["_gt", "_gte", "_lt", "_lte"]) {
                            filterFields += "\n\t" + f.key + operator + ":" + type;
                        }
                    if (f.valueType === String)
                        for (const operator of ["_st", "_contains"]) {
                            filterFields += "\n\t" + f.key + operator + ":" + type;
                        }
                    if (f.allowNull)
                        filterFields += "\n\t" + f.key + "_null:Boolean";
                    filterFields += "\n\t" + f.key + "_in:[" + type + "]";
                }
            }
            types += "type " + key + "{" + fields + "\n}\n";
            types += "input " + key + "Filter{" + filterFields + "\n\tOR:[" + key + "Filter]\n}\n";
            query += "\n\t" + key + "(options: options, filter:" + key + "Filter): [" + key + "]";
            root[key] = async ({ options, filter }, req) => {
                let remult = await api.getRemult(req);
                let repo = remult.repo(e);
                let dapi = new DataApi(repo, remult);
                let result: any;
                let err: any;
                await dapi.getArray({
                    success: x => result = x,
                    created: undefined,
                    deleted: undefined,
                    error: x => err = x,
                    forbidden: () => err = 'forbidden',
                    notFound: () => err = 'not found',
                    progress: undefined
    
    
                }, {
                    get: key => {
                        if (options)
                            switch (key) {
                                case "_limit":
                                    return options.limit;
                                case "_page":
                                    return options.page;
                                case "_sort":
                                    return options.sort;
                                case "_order":
                                    return options.order;
                            }
                    }
                }, filter);
                if (err)
                    throw err;
                return result;
            }
        }
    }





    return {
        rootValue: root,
        schema:
            `
input options{
    limit:Int
    page:Int
    sort:String
    order:String
}
${types}
type Query {${query}
}
`
    };
}