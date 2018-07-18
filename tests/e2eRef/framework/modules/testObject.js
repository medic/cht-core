let Page = function (o) {
    for (let i in o) {
        this[i] = o[i];
    }
    this.index();
    return this;
};

Page.prototype.index = function () {
    let locs = this.locators;
    this.el = this.prepareElements(locs);
    return this;
};

Page.prototype.prepareElements = function(locators) {
    let extend = require("./extension");
    let loc, i, type, elems = {}, items = ['_all', '_first', '_second', '_third', '_last', 'locator'];
    for(i in locators) {
        loc = locators[i];
        type = Object.keys(loc)[0];
        elems[i] = element(By[type](loc[type]));
        elems[i]._all = element.all(By[type](loc[type]));
        elems[i]._first = element.all(By[type](loc[type])).first();
        elems[i]._second = element.all(By[type](loc[type])).get(1);
        elems[i]._third = element.all(By[type](loc[type])).get(2);
        elems[i]._last = element.all(By[type](loc[type])).last();
        elems[i].locator = loc[type];
    }

    Object.values(elems).forEach((item) => {
        Object.keys(extend).forEach((method) => {
            item[method] = (par1, par2, par3, par4) => {
                extend[method](item, par1, par2, par3, par4);
            };
            items.forEach((key) => {
                item[key][method] = (par1, par2, par3, par4) => {
                    extend[method](item[key], par1, par2, par3, par4);
                };
            });
        });
    });
    return elems;
};

module.exports = Page;