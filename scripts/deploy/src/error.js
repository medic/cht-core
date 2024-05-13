
class UserRuntimeError extends Error {
    constructor(message) {
        super(message);
        this.name = "UserRuntimeError";
    }
}

export default UserRuntimeError;
