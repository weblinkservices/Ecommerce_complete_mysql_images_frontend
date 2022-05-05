
class APIFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;

    }

    search() {
        const find = this.queryStr.keyword
        
        let result = async function () {
            try {
                const rows = this.query.query(`SELECT * FROM products WHERE name LIKE '%${find}%'
                or description Like '%${find}%';`);
                product = rows;
            } finally {
                this.query = product;
                // console.log("first", this);
                return this;
            }
        }
        result()
        
        return this;
      

    }

    filter() {
        const queryCopy = { ...this.queryStr };

        //Removing fields from query string
        const removeFields = ['keyword', 'limit', 'page']
        removeFields.forEach(el => delete queryCopy[el]);

        //Advance filter for price, ratings etc
        // let queryStr = JSON.stringify(queryCopy)
        // queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`)


        var sql = `select * from products where category="${queryCopy.category}";`;
        connection.query(sql, function (err, result) {
            if (err) throw err;
            this.query = result;
        })

        return this
    }

    pagination(resPerPage) {
        const currentPage = Number(this.queryStr.page) || 1;
        const skip = resPerPage * (currentPage - 1);

        var sql = `select * from products limit ${resPerPage} offset ${skip};`;
        connection.query(sql, function (err, result) {
            if (err) throw err;
            this.query = result;
        })

        // all prod print
        // console.log("this : ", this);
        return this;


        // const currentPage = Number(this.queryStr.page) || 1;
        // const skip = resPerPage * (currentPage - 1);

        // this.query = this.query.limit(resPerPage).skip(skip)
        // return this;
    }
}

module.exports = APIFeatures