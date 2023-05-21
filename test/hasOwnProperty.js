class Test {
    constructor(data) {
        this.data = data;
    }
    func() {
        console.log("func(): data = ", this.data);
    }
    run() {
        if (this.hasOwnProperty("func")) {
            this.func();
        }
        console.log("run ...");
    }
}

function main() {
    let test = new Test(201);
    test.run();
}
