"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFiles = exports.getSrcSpan = exports.getLineNumber = exports.forNode = exports.flatMap = exports.getSingleton = exports.flattenBlock = exports.StmtParser = exports.parseGMark = exports.undefinedValue = exports.parseExpr = exports.anyType = exports.mustExist = exports.GModule = void 0;
var ts = require("typescript");
var typescript_1 = require("typescript");
var GModule = /** @class */ (function () {
    function GModule(name, stmts) {
        this.name = name;
        this.stmts = stmts;
    }
    return GModule;
}());
exports.GModule = GModule;
function mustExist(v, msg) {
    if (!v) {
        if (msg) {
            throw new Error("Must exists! Message: " + msg);
        }
        else {
            throw new Error("Must exists!");
        }
    }
    return v;
}
exports.mustExist = mustExist;
var UserAnnot = /** @class */ (function () {
    function UserAnnot(ty) {
        this.ty = ty;
        this.category = "UserAnnot";
    }
    return UserAnnot;
}());
var Inferred = /** @class */ (function () {
    function Inferred(ty) {
        this.ty = ty;
        this.category = "Inferred";
    }
    return Inferred;
}());
var TVar = /** @class */ (function () {
    function TVar(name) {
        this.name = name;
        this.category = "TVar";
        mustExist(name);
    }
    return TVar;
}());
var AnyType = /** @class */ (function () {
    function AnyType() {
        this.category = "AnyType";
        this.name = "any";
    }
    AnyType.instance = new AnyType();
    return AnyType;
}());
var FuncType = /** @class */ (function () {
    function FuncType(args, to) {
        this.args = args;
        this.to = to;
        this.category = "FuncType";
    }
    return FuncType;
}());
var ObjectType = /** @class */ (function () {
    function ObjectType(fields) {
        this.fields = fields;
        this.category = "ObjectType";
    }
    return ObjectType;
}());
exports.anyType = AnyType.instance;
var basicTypes = new Map();
basicTypes.set(typescript_1.SyntaxKind.BooleanKeyword, "boolean");
basicTypes.set(typescript_1.SyntaxKind.TrueKeyword, "boolean");
basicTypes.set(typescript_1.SyntaxKind.FalseKeyword, "boolean");
basicTypes.set(typescript_1.SyntaxKind.NumberKeyword, "number");
basicTypes.set(typescript_1.SyntaxKind.StringKeyword, "string");
basicTypes.set(typescript_1.SyntaxKind.SymbolKeyword, "Symbol");
basicTypes.set(typescript_1.SyntaxKind.EnumKeyword, "Enum");
basicTypes.set(typescript_1.SyntaxKind.VoidKeyword, "void");
basicTypes.set(typescript_1.SyntaxKind.ObjectKeyword, "object");
basicTypes.set(typescript_1.SyntaxKind.BigIntKeyword, "BigInt");
var ignoredTypes = new Set();
ignoredTypes.add(typescript_1.SyntaxKind.MappedType);
ignoredTypes.add(typescript_1.SyntaxKind.ConditionalType);
ignoredTypes.add(typescript_1.SyntaxKind.ThisType);
ignoredTypes.add(typescript_1.SyntaxKind.UnknownKeyword);
ignoredTypes.add(typescript_1.SyntaxKind.IndexedAccessType);
ignoredTypes.add(typescript_1.SyntaxKind.UndefinedKeyword);
ignoredTypes.add(typescript_1.SyntaxKind.NeverKeyword);
ignoredTypes.add(typescript_1.SyntaxKind.TypeOperator);
ignoredTypes.add(typescript_1.SyntaxKind.NullKeyword);
function parseTVars(n) {
    return n.typeParameters ? n.typeParameters.map(function (p) { return p.name.text; }) : [];
}
/** Replace all occurrences of type variables with any  */
function eliminateTypeVars(ty, tVars) {
    switch (ty.category) {
        case "TVar":
            if (tVars.includes(ty.name)) {
                return exports.anyType;
            }
            else {
                return ty;
            }
        case "FuncType": {
            var newFrom = ty.args.map(function (t) { return eliminateTypeVars(t, tVars); });
            var newTo = eliminateTypeVars(ty.to, tVars);
            return new FuncType(newFrom, newTo);
        }
        case "ObjectType": {
            var nf = ty.fields.map(function (nv) { return new NamedValue(nv.name, eliminateTypeVars(nv.value, tVars)); });
            return new ObjectType(nf);
        }
        case "AnyType":
            return ty;
        default:
            throw new Error("Unknown category: " + JSON.stringify(ty));
    }
}
function parseSignatureType(sig) {
    var tVars = parseTVars(sig);
    var argTypes = sig.parameters.map(function (p) {
        return p.type ? eliminateTypeVars(parseTypeNode(mustExist(p.type)), tVars) : exports.anyType;
    });
    var retType = sig.type ? eliminateTypeVars(parseTypeNode(sig.type), tVars) : new TVar("void");
    return new FuncType(argTypes, retType);
}
function parseDeclarationName(n) {
    switch (n.kind) {
        case typescript_1.SyntaxKind.Identifier:
            return n.text;
        case typescript_1.SyntaxKind.StringLiteral:
            return n.text;
        case typescript_1.SyntaxKind.NumericLiteral:
            return n.text;
        default:
            return "UnhandledDeclarationName";
    }
}
function parseTypeMember(member) {
    if (member.name) {
        if (typescript_1.SyntaxKind.PropertyDeclaration == member.kind || typescript_1.SyntaxKind.PropertySignature == member.kind) {
            var x = member;
            return (new NamedValue(parseDeclarationName(x.name), x.type ? parseTypeNode(x.type) : exports.anyType));
        }
        else if (typescript_1.SyntaxKind.MethodSignature == member.kind || typescript_1.SyntaxKind.MethodDeclaration == member.kind) {
            var x = member;
            return (new NamedValue(parseDeclarationName(x.name), parseSignatureType(x)));
        }
        else {
            throw new Error("Unknown type member kind: " + typescript_1.SyntaxKind[member.kind]);
        }
    }
    else if ([typescript_1.SyntaxKind.IndexSignature, typescript_1.SyntaxKind.CallSignature,
        typescript_1.SyntaxKind.ConstructSignature].includes(member.kind)) {
        var sig = member;
        var methodName = sig.kind == typescript_1.SyntaxKind.IndexSignature ? "access"
            : (sig.kind == typescript_1.SyntaxKind.ConstructSignature ? "CONSTRUCTOR" : "call");
        return (new NamedValue(methodName, parseSignatureType(sig)));
    }
    else {
        throw new Error("Unknown type element: " + ts.SyntaxKind[member.kind]);
    }
}
function parseEntityName(n) {
    if (n.kind == typescript_1.SyntaxKind.Identifier) {
        return n.text;
    }
    else {
        return parseEntityName(n.left) + "." + n.right.text;
    }
}
function parseTypeNode(node) {
    if (node.kind == typescript_1.SyntaxKind.AnyKeyword || node.kind == typescript_1.SyntaxKind.ThisKeyword) {
        return exports.anyType;
    }
    else if (ts.isTypeReferenceNode(node)) {
        var n = node;
        return new TVar(parseEntityName(n.typeName));
    }
    else if (basicTypes.has(node.kind)) {
        return new TVar(basicTypes.get(node.kind));
    }
    else if (node.kind == typescript_1.SyntaxKind.ArrayType) {
        return new TVar("Array");
    }
    else if (node.kind == typescript_1.SyntaxKind.FunctionType || node.kind == typescript_1.SyntaxKind.ConstructorType) {
        var n = node;
        var ret = parseTypeNode(n.type);
        var args = n.parameters.map(function (p) {
            return p.type ? parseTypeNode(p.type) : exports.anyType;
        });
        return eliminateTypeVars(new FuncType(args, ret), parseTVars(n));
    }
    else if (node.kind == typescript_1.SyntaxKind.TypeLiteral) {
        var n = node;
        var members = n.members.map(parseTypeMember);
        return new ObjectType(members);
    }
    else if (node.kind == typescript_1.SyntaxKind.UnionType) {
        var n = node;
        if (n.types.length == 2) {
            var second = parseTypeNode(n.types[1]);
            if (second.category == "TVar" &&
                (second.name == "null" || second.name == "undefined")) {
                return parseTypeNode(n.types[0]);
            }
            else {
                return exports.anyType;
            }
        }
        return exports.anyType;
    }
    else if (ignoredTypes.has(node.kind)) {
        return exports.anyType;
    }
    else if (node.kind == typescript_1.SyntaxKind.LiteralType) {
        var n = node;
        switch (n.literal.kind) {
            case typescript_1.SyntaxKind.StringLiteral:
                return new TVar("string");
            case typescript_1.SyntaxKind.TrueKeyword:
            case typescript_1.SyntaxKind.FalseKeyword:
                return new TVar("boolean");
            case typescript_1.SyntaxKind.NumericLiteral:
                return new TVar("number");
            default:
                return exports.anyType;
        }
    }
    else if (node.kind == typescript_1.SyntaxKind.IntersectionType) {
        return exports.anyType;
    }
    else if (node.kind == typescript_1.SyntaxKind.ParenthesizedType) {
        var n = node;
        return parseTypeNode(n.type);
    }
    else if (node.kind == typescript_1.SyntaxKind.FirstTypeNode || node.kind == typescript_1.SyntaxKind.LastTypeNode) {
        return new TVar("boolean");
    }
    else if (node.kind == typescript_1.SyntaxKind.TupleType) {
        return new TVar("Array");
    }
    else if (node.kind == typescript_1.SyntaxKind.TypeQuery) {
        return exports.anyType; // fixme: handle type query
    }
    else {
        throw new Error("Unknown Type Kind: " + ts.SyntaxKind[node.kind]);
    }
}
var NamedValue = /** @class */ (function () {
    function NamedValue(name, value) {
        this.name = name;
        this.value = value;
    }
    return NamedValue;
}());
var Var = /** @class */ (function () {
    function Var(name) {
        this.name = name;
        this.category = "Var";
        this.mark = "missing";
        mustExist(name);
    }
    return Var;
}());
var Const = /** @class */ (function () {
    function Const(value, ty, line) {
        this.value = value;
        this.ty = ty;
        this.line = line;
        this.category = "Const";
        mustExist(value);
        this.mark = new Inferred(ty);
    }
    return Const;
}());
var Cast = /** @class */ (function () {
    function Cast(expr, ty) {
        this.expr = expr;
        this.ty = ty;
        this.category = "Cast";
        mustExist(expr);
        this.mark = new Inferred(ty);
    }
    return Cast;
}());
var FuncCall = /** @class */ (function () {
    function FuncCall(f, args, mark) {
        this.f = f;
        this.args = args;
        this.mark = mark;
        this.category = "FuncCall";
    }
    return FuncCall;
}());
var ObjLiteral = /** @class */ (function () {
    function ObjLiteral(fields, mark) {
        this.fields = fields;
        this.mark = mark;
        this.category = "ObjLiteral";
    }
    return ObjLiteral;
}());
var Access = /** @class */ (function () {
    function Access(expr, field, mark) {
        this.expr = expr;
        this.field = field;
        this.mark = mark;
        this.category = "Access";
        mustExist(field);
    }
    return Access;
}());
var IfExpr = /** @class */ (function () {
    function IfExpr(cond, e1, e2, mark) {
        this.cond = cond;
        this.e1 = e1;
        this.e2 = e2;
        this.mark = mark;
        this.category = "IfExpr";
    }
    return IfExpr;
}());
var VarDef = /** @class */ (function () {
    function VarDef(x, mark, init, isConst, modifiers, srcSpan) {
        this.x = x;
        this.mark = mark;
        this.init = init;
        this.isConst = isConst;
        this.modifiers = modifiers;
        this.srcSpan = srcSpan;
        this.category = "VarDef";
        mustExist(x);
    }
    return VarDef;
}());
var AssignStmt = /** @class */ (function () {
    function AssignStmt(lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
        this.category = "AssignStmt";
    }
    return AssignStmt;
}());
var ExprStmt = /** @class */ (function () {
    function ExprStmt(expr, isReturn) {
        this.expr = expr;
        this.isReturn = isReturn;
        this.category = "ExprStmt";
    }
    return ExprStmt;
}());
var IfStmt = /** @class */ (function () {
    function IfStmt(cond, branch1, branch2) {
        this.cond = cond;
        this.branch1 = branch1;
        this.branch2 = branch2;
        this.category = "IfStmt";
    }
    return IfStmt;
}());
var WhileStmt = /** @class */ (function () {
    function WhileStmt(cond, body) {
        this.cond = cond;
        this.body = body;
        this.category = "WhileStmt";
    }
    return WhileStmt;
}());
var ImportSingle = /** @class */ (function () {
    function ImportSingle(oldName, newName, path) {
        this.oldName = oldName;
        this.newName = newName;
        this.path = path;
        this.category = "ImportSingle";
    }
    return ImportSingle;
}());
var ImportDefault = /** @class */ (function () {
    function ImportDefault(newName, path) {
        this.newName = newName;
        this.path = path;
        this.category = "ImportDefault";
    }
    return ImportDefault;
}());
var ImportModule = /** @class */ (function () {
    function ImportModule(newName, path) {
        this.newName = newName;
        this.path = path;
        this.category = "ImportModule";
    }
    return ImportModule;
}());
var ExportSingle = /** @class */ (function () {
    function ExportSingle(oldName, newName, from) {
        this.oldName = oldName;
        this.newName = newName;
        this.from = from;
        this.category = "ExportSingle";
    }
    return ExportSingle;
}());
var ExportDefault = /** @class */ (function () {
    function ExportDefault(newName, from) {
        this.newName = newName;
        this.from = from;
        this.category = "ExportDefault";
    }
    return ExportDefault;
}());
var ExportModule = /** @class */ (function () {
    function ExportModule(from) {
        this.from = from;
        this.category = "ExportModule";
    }
    return ExportModule;
}());
var NamespaceAliasStmt = /** @class */ (function () {
    function NamespaceAliasStmt(name, rhs) {
        this.name = name;
        this.rhs = rhs;
        this.category = "NamespaceAliasStmt";
    }
    return NamespaceAliasStmt;
}());
var TypeAliasStmt = /** @class */ (function () {
    function TypeAliasStmt(name, tyVars, type, modifiers, superTypes) {
        this.name = name;
        this.tyVars = tyVars;
        this.type = type;
        this.modifiers = modifiers;
        this.superTypes = superTypes;
        this.category = "TypeAliasStmt";
        mustExist(name);
        mustExist(tyVars);
        mustExist(type);
        mustExist(modifiers);
    }
    return TypeAliasStmt;
}());
var CommentStmt = /** @class */ (function () {
    function CommentStmt(text) {
        this.text = text;
        this.category = "CommentStmt";
        mustExist(text);
    }
    return CommentStmt;
}());
var BlockStmt = /** @class */ (function () {
    function BlockStmt(stmts) {
        this.stmts = stmts;
        this.category = "BlockStmt";
    }
    return BlockStmt;
}());
var NamespaceStmt = /** @class */ (function () {
    function NamespaceStmt(name, block, modifiers) {
        this.name = name;
        this.block = block;
        this.modifiers = modifiers;
        this.category = "NamespaceStmt";
    }
    return NamespaceStmt;
}());
var FuncDef = /** @class */ (function () {
    function FuncDef(name, args, returnType, body, modifiers, tyVars) {
        this.name = name;
        this.args = args;
        this.returnType = returnType;
        this.body = body;
        this.modifiers = modifiers;
        this.tyVars = tyVars;
        this.category = "FuncDef";
        mustExist(name);
    }
    return FuncDef;
}());
var Constructor = /** @class */ (function (_super) {
    __extends(Constructor, _super);
    function Constructor(name, args, returnType, body, modifiers, tyVars, publicVars) {
        var _this = _super.call(this, name, args, [returnType, null], body, modifiers, tyVars) || this;
        _this.publicVars = publicVars;
        mustExist(publicVars);
        return _this;
    }
    return Constructor;
}(FuncDef));
var ClassDef = /** @class */ (function () {
    function ClassDef(name, constr, instanceLambdas, staticLambdas, vars, funcDefs, superTypes, modifiers, tyVars) {
        this.name = name;
        this.constr = constr;
        this.instanceLambdas = instanceLambdas;
        this.staticLambdas = staticLambdas;
        this.vars = vars;
        this.funcDefs = funcDefs;
        this.superTypes = superTypes;
        this.modifiers = modifiers;
        this.tyVars = tyVars;
        this.category = "ClassDef";
    }
    return ClassDef;
}());
function parseExpr(node, allocateLambda, checker) {
    function rec(node) {
        var n = node;
        mustExist(n);
        function infer() {
            return parseGMark(undefined, node, checker);
        }
        switch (n.kind) {
            case typescript_1.SyntaxKind.Identifier: {
                var name = n.text;
                return new Var(name);
            }
            case typescript_1.SyntaxKind.ThisKeyword:
                return SpecialVars.THIS;
            case typescript_1.SyntaxKind.SuperKeyword:
                return SpecialVars.SUPER;
            case typescript_1.SyntaxKind.CallExpression: {
                var f = rec(n.expression);
                var args = n.arguments.map(rec);
                return new FuncCall(f, args, infer());
            }
            case typescript_1.SyntaxKind.NewExpression: {
                var args = n.arguments ? n.arguments.map(rec) : [];
                var f = new Access(rec(n.expression), "CONSTRUCTOR", "missing");
                return new FuncCall(f, args, infer());
            }
            case typescript_1.SyntaxKind.ObjectLiteralExpression: {
                var fields = flatMap(n.properties, function (p) {
                    if (p.kind == typescript_1.SyntaxKind.PropertyAssignment ||
                        p.kind == typescript_1.SyntaxKind.ShorthandPropertyAssignment) {
                        return [parseObjectLiteralElementLike(p)];
                    }
                    else {
                        return []; //todo: other cases
                    }
                });
                return new ObjLiteral(fields, infer());
            }
            case typescript_1.SyntaxKind.PropertyAccessExpression: {
                var lhs = rec(n.expression);
                return new Access(lhs, n.name.text, infer());
            }
            case ts.SyntaxKind.ElementAccessExpression: {
                var thing = rec(n.expression);
                var index = rec(n.argumentExpression);
                return new FuncCall(new Access(thing, "access", "missing"), [index], infer());
            }
            case ts.SyntaxKind.ConditionalExpression: {
                var cond = rec(n.condition);
                var e1 = rec(n.whenTrue);
                var e2 = rec(n.whenFalse);
                return new IfExpr(cond, e1, e2, infer());
            }
            case ts.SyntaxKind.ParenthesizedExpression: {
                return rec(n.expression);
            }
            // constants
            case typescript_1.SyntaxKind.NumericLiteral:
                return constExpr("number");
            case typescript_1.SyntaxKind.StringLiteral:
                return constExpr("string");
            case typescript_1.SyntaxKind.RegularExpressionLiteral:
                return constExpr("RegExp");
            case typescript_1.SyntaxKind.TrueKeyword:
            case typescript_1.SyntaxKind.FalseKeyword:
                return constExpr("boolean");
            case typescript_1.SyntaxKind.NullKeyword:
                return constExpr(exports.anyType.name, "null");
            case typescript_1.SyntaxKind.VoidExpression: {
                return constExpr("void", "void");
            }
            case typescript_1.SyntaxKind.ArrayLiteralExpression: {
                var a = node;
                var exs = a.elements.map(rec);
                return new FuncCall(new Var("Array"), exs, infer());
            }
            // operators
            case ts.SyntaxKind.BinaryExpression: {
                var l = rec(n.left);
                var r = rec(n.right);
                var opp = n.operatorToken.kind;
                return new FuncCall(new Var(ts.SyntaxKind[opp]), [l, r], infer());
            }
            case typescript_1.SyntaxKind.PrefixUnaryExpression:
            case typescript_1.SyntaxKind.PostfixUnaryExpression: {
                var opName = ts.SyntaxKind[n["operator"]];
                var fixity = (node.kind == typescript_1.SyntaxKind.PrefixUnaryExpression) ? "" : "POST_";
                var arg = rec(n["operand"]);
                return new FuncCall(new Var(fixity + opName), [arg], infer());
            }
            case typescript_1.SyntaxKind.ArrowFunction:
            case typescript_1.SyntaxKind.FunctionExpression: {
                try {
                    return allocateLambda(n);
                }
                catch (e) {
                    return exports.undefinedValue;
                }
            }
            // Special treatments:
            case typescript_1.SyntaxKind.SpreadElement: {
                var n1 = n.expression;
                return new FuncCall(SpecialVars.spread, [rec(n1)], infer());
            }
            case typescript_1.SyntaxKind.TypeOfExpression: {
                return new FuncCall(SpecialVars.typeOf, [rec(n.expression)], infer());
            }
            case typescript_1.SyntaxKind.TaggedTemplateExpression: {
                var tagE = rec(n.tag);
                var temp = rec(n.template);
                return new FuncCall(tagE, [temp], infer());
            }
            case typescript_1.SyntaxKind.TemplateExpression: {
                var spans = n.templateSpans.map(function (sp) { return rec(sp.expression); });
                return new FuncCall(SpecialVars.Template, spans, infer());
            }
            case typescript_1.SyntaxKind.NoSubstitutionTemplateLiteral:
                return constExpr("string");
            case typescript_1.SyntaxKind.DeleteExpression: {
                return new FuncCall(SpecialVars.DELETE, [rec(n.expression)], infer());
            }
            case typescript_1.SyntaxKind.YieldExpression: {
                return new FuncCall(SpecialVars.YIELD, [rec(mustExist(n.expression))], infer());
            }
            case typescript_1.SyntaxKind.AwaitExpression: {
                return new FuncCall(SpecialVars.AWAIT, [rec(n.expression)], infer());
            }
            case typescript_1.SyntaxKind.NonNullExpression: {
                return rec(n.expression);
            }
            case typescript_1.SyntaxKind.JsxElement:
            case typescript_1.SyntaxKind.JsxSelfClosingElement: {
                return exports.undefinedValue;
            }
            case typescript_1.SyntaxKind.TypeAssertionExpression:
            case typescript_1.SyntaxKind.AsExpression: {
                var e = rec(n.expression);
                var t = parseTypeNode(n.type);
                return new Cast(e, t);
            }
            // type assertions are ignored
            case typescript_1.SyntaxKind.OmittedExpression:
            case typescript_1.SyntaxKind.ImportKeyword:
            case typescript_1.SyntaxKind.MetaProperty:
            case typescript_1.SyntaxKind.ClassExpression: {
                return exports.undefinedValue; //todo: properly handle
            }
            default: {
                throw new Error("Unknown expression category: " + ts.SyntaxKind[node.kind]
                    + ". Text: " + node.getText());
            }
        }
        function constExpr(typeName, value) {
            // let v = (<ts.LiteralLikeNode>node).text;
            var v = value ? value : "???";
            return new Const(v, new TVar(typeName), getLineNumber(n));
        }
        function parseObjectLiteralElementLike(p) {
            //todo: properly handle other cases like accessors
            var fieldName = p.name.getText();
            var rhs = (p.kind == typescript_1.SyntaxKind.PropertyAssignment) ? rec(p.initializer) : new Var(fieldName);
            return new NamedValue(fieldName, rhs);
        }
    }
    return rec(node);
}
exports.parseExpr = parseExpr;
exports.undefinedValue = new Var("undefined");
function parseGMark(tyNode, node, checker) {
    if (!tyNode) {
        if (node) {
            var ty = checker.getTypeAtLocation(node);
            var n = checker.typeToTypeNode(ty);
            var t = n ? parseTypeNode(n) : exports.anyType;
            if (t.category == "AnyType") {
                return "missing";
            }
            else {
                return new Inferred(t);
            }
        }
        else {
            return "missing";
        }
    }
    else {
        return new UserAnnot(parseTypeNode(tyNode));
    }
}
exports.parseGMark = parseGMark;
var StmtParser = /** @class */ (function () {
    function StmtParser(checker) {
        this.checker = checker;
        this.nLambda = [0];
    }
    StmtParser.prototype.parseStmt = function (node) {
        var checker = this.checker;
        function parseMark(tyNode, node) {
            return parseGMark(tyNode, node, checker);
        }
        var getNLambda = this.nLambda;
        var StmtsHolder = /** @class */ (function () {
            function StmtsHolder(stmts) {
                this.stmts = stmts;
            }
            return StmtsHolder;
        }());
        var ExprProcessor = /** @class */ (function () {
            function ExprProcessor() {
                this.lambdaDefs = [];
            }
            ExprProcessor.prototype.processExpr = function (e) {
                var lambdas = this.lambdaDefs;
                function allocateLambda(f) {
                    var n0 = f.name;
                    var name;
                    if (n0) {
                        name = n0.getText();
                    }
                    else {
                        name = "$Lambda" + getNLambda[0];
                        getNLambda[0] += 1;
                    }
                    var srcSpan = n0 ? getSrcSpan(n0) : null;
                    lambdas.push(parseFunction(name, f, parseModifiers(f.modifiers), srcSpan));
                    return new Var(name);
                }
                return parseExpr(e, allocateLambda, checker);
            };
            ExprProcessor.prototype.alongWith = function () {
                var stmts = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    stmts[_i] = arguments[_i];
                }
                return new StmtsHolder(this.lambdaDefs.concat(stmts));
            };
            ExprProcessor.prototype.alongWithMany = function (stmts) {
                return new StmtsHolder(this.lambdaDefs.concat(stmts));
            };
            return ExprProcessor;
        }());
        /**
         * returns the parsed FuncDef along with arguments that are marked
         * with 'public' (for constructors)
         */
        function parseFunction(name, n, modifiers, returnSrcSpan) {
            function inferRetType() {
                if (n.type) {
                    return parseMark(n.type, undefined);
                }
                var tNode = checker.typeToTypeNode(checker.getTypeAtLocation(n));
                if (tNode) {
                    var t = parseTypeNode(tNode);
                    if (t.category == "FuncType") {
                        return new Inferred(t.to);
                    }
                }
                return "missing";
            }
            var isConstructor = ts.isConstructorDeclaration(n);
            var retType = inferRetType();
            var publicArgs = [];
            var bindingInArgs = false;
            var args = n.parameters.map(function (p) {
                var name;
                if (p.name.kind == typescript_1.SyntaxKind.Identifier) {
                    name = p.name.text;
                }
                else {
                    name = "_";
                    bindingInArgs = true;
                }
                if (parseModifiers(p.modifiers).includes("public")) {
                    publicArgs.push(name);
                }
                return new NamedValue(name, [parseMark(p.type, undefined), getSrcSpan(p.name)]);
            });
            var body;
            if (n.kind != typescript_1.SyntaxKind.IndexSignature && n.body && !bindingInArgs) {
                if (n.body.kind == typescript_1.SyntaxKind.Block) {
                    body = rec(n.body);
                }
                else {
                    var ep = new ExprProcessor();
                    // try to parse the body as a ConciseFunction body
                    body = ep.alongWith(new ExprStmt(ep.processExpr(n.body), true));
                }
            }
            else {
                body = new ExprProcessor().alongWithMany([]);
            }
            var type_params = n.typeParameters;
            var t_vars;
            if (type_params) {
                t_vars = type_params.map(function (n) { return n.name.text; });
            }
            else {
                t_vars = [];
            }
            return isConstructor ?
                new Constructor(name, args, retType, flattenBlock(body.stmts), modifiers, t_vars, publicArgs) :
                new FuncDef(name, args, [retType, returnSrcSpan], flattenBlock(body.stmts), modifiers, t_vars);
        }
        function rec(node) {
            return handleError(node, function () {
                mustExist(node);
                var EP = new ExprProcessor();
                function parseVarDecList(node, modifiers, rhs) {
                    return handleError(node, function () {
                        var isConst = (node.flags & ts.NodeFlags.Const) != 0;
                        function parseVarDec(dec, rhs) {
                            var rhs1 = rhs ? rhs : (dec.initializer ? EP.processExpr(dec.initializer) : null);
                            return parseBindingName(dec.name, rhs1, dec.type);
                        }
                        function parseBindingName(lhs, rhs, ty) {
                            switch (lhs.kind) {
                                case typescript_1.SyntaxKind.Identifier:
                                    var vd = new VarDef(lhs.text, parseMark(ty, lhs), rhs, isConst, modifiers, getSrcSpan(lhs));
                                    return [vd];
                                case typescript_1.SyntaxKind.ObjectBindingPattern:
                                    return flatMap(lhs.elements, function (e) {
                                        var fieldName = e.propertyName ? e.propertyName : e.name;
                                        var fName;
                                        switch (fieldName.kind) {
                                            case typescript_1.SyntaxKind.Identifier:
                                            case typescript_1.SyntaxKind.StringLiteral:
                                            case typescript_1.SyntaxKind.ComputedPropertyName:
                                            case typescript_1.SyntaxKind.NumericLiteral:
                                                fName = parsePropertyName(fieldName);
                                                break;
                                            default:
                                                fName = SpecialVars.UNKNOWN;
                                                break;
                                        }
                                        var access = rhs ? new Access(rhs, fName, "missing") : null;
                                        return parseBindingName(e.name, access);
                                    });
                                case typescript_1.SyntaxKind.ArrayBindingPattern: {
                                    var arrayAccessed_1 = rhs ? new FuncCall(SpecialVars.ArrayAccess, [rhs], "missing") : null;
                                    return flatMap(lhs.elements, function (e) {
                                        if (e.kind == typescript_1.SyntaxKind.OmittedExpression) {
                                            return [];
                                        }
                                        else {
                                            return parseBindingName(e.name, arrayAccessed_1);
                                        }
                                    });
                                }
                            }
                        }
                        var dec = node.declarations;
                        return flatMap(dec, function (x) { return parseVarDec(x, rhs); });
                    });
                }
                function isStatic(n) {
                    return parseModifiers(n.modifiers).includes("static");
                }
                switch (node.kind) {
                    case typescript_1.SyntaxKind.ThrowStatement:
                    case typescript_1.SyntaxKind.ExpressionStatement: {
                        var n = node;
                        if (n.expression.kind == typescript_1.SyntaxKind.BinaryExpression) {
                            var e = n.expression;
                            if (e.operatorToken.kind == ts.SyntaxKind.FirstAssignment) {
                                var l = EP.processExpr(e.left);
                                var r = EP.processExpr(e.right);
                                return EP.alongWith(new AssignStmt(l, r));
                            }
                        }
                        var shouldReturn = n.expression.kind == typescript_1.SyntaxKind.YieldExpression;
                        return EP.alongWith(new ExprStmt(EP.processExpr(n.expression), shouldReturn));
                    }
                    case typescript_1.SyntaxKind.ReturnStatement: {
                        var n = node;
                        return n.expression ?
                            EP.alongWith(new ExprStmt(EP.processExpr(n.expression), true))
                            : EP.alongWith(new CommentStmt("return;"));
                    }
                    case typescript_1.SyntaxKind.VariableStatement: {
                        var n = node;
                        var ms = parseModifiers(n.modifiers);
                        var list = n.declarationList;
                        return EP.alongWithMany(parseVarDecList(list, ms));
                    }
                    case typescript_1.SyntaxKind.IfStatement: {
                        var n = node;
                        var cond = EP.processExpr(n.expression);
                        var then = flattenBlock(rec(n.thenStatement).stmts);
                        var otherwise = void 0;
                        if (n.elseStatement == undefined) {
                            otherwise = [new BlockStmt([])];
                        }
                        else {
                            otherwise = rec(n.elseStatement).stmts;
                        }
                        return EP.alongWith(new IfStmt(cond, then, flattenBlock(otherwise)));
                    }
                    case typescript_1.SyntaxKind.DoStatement: // simply treat do as while
                    case typescript_1.SyntaxKind.WhileStatement: {
                        var n = node;
                        var cond = EP.processExpr(n.expression);
                        var body = flattenBlock(rec(n.statement).stmts);
                        return EP.alongWith(new WhileStmt(cond, body));
                    }
                    case typescript_1.SyntaxKind.Block: {
                        var n = node;
                        var stmts = flatMap(n.statements, function (x) { return rec(x).stmts; });
                        return EP.alongWith(new BlockStmt(stmts));
                    }
                    case typescript_1.SyntaxKind.ForOfStatement:
                    case typescript_1.SyntaxKind.ForInStatement:
                    case typescript_1.SyntaxKind.ForStatement: {
                        var n = node;
                        var cond = new Const("true", new TVar("boolean"), getLineNumber(n));
                        var incr = [];
                        var expression = undefined;
                        if (n.kind == typescript_1.SyntaxKind.ForStatement) {
                            if (n.condition) {
                                cond = EP.processExpr(n.condition);
                            }
                            if (n.incrementor) {
                                incr = [new ExprStmt(EP.processExpr(n.incrementor), false)];
                            }
                        }
                        else {
                            var rhs = EP.processExpr(n.expression);
                            expression = new FuncCall(SpecialVars.ArrayAccess, [rhs], "missing");
                        }
                        var init = n.initializer;
                        var outerBlock = new BlockStmt([]);
                        if (init && ts.isVariableDeclarationList(init)) {
                            outerBlock.stmts = parseVarDecList(init, [], expression);
                        }
                        else if (init) {
                            outerBlock.stmts.push(new ExprStmt(EP.processExpr(init), false));
                        }
                        var bodyStmts = rec(n.statement).stmts.concat(incr);
                        outerBlock.stmts.push(new WhileStmt(cond, flattenBlock(bodyStmts)));
                        return EP.alongWith(outerBlock);
                    }
                    case typescript_1.SyntaxKind.FunctionDeclaration:
                    case typescript_1.SyntaxKind.MethodDeclaration:
                    case typescript_1.SyntaxKind.GetAccessor:
                    case typescript_1.SyntaxKind.SetAccessor:
                    case typescript_1.SyntaxKind.Constructor: {
                        var name = (node.kind == typescript_1.SyntaxKind.Constructor) ? "Constructor" :
                            useOrElse(node.name, function (x) { return parsePropertyName(x); }, "defaultFunc");
                        var n = node;
                        var modifiers = parseModifiers(n.modifiers);
                        if (node.kind == typescript_1.SyntaxKind.SetAccessor) {
                            modifiers.push("set");
                        }
                        else if (node.kind == typescript_1.SyntaxKind.GetAccessor) {
                            modifiers.push("get");
                        }
                        var srcSpan = n.name ? getSrcSpan(n.name) : null;
                        return EP.alongWith(parseFunction(name, n, modifiers, srcSpan));
                    }
                    case typescript_1.SyntaxKind.ClassDeclaration: {
                        var n = node;
                        var name = n.name ? n.name.text : "DefaultClass";
                        var superTypes = [];
                        if (n.heritageClauses) {
                            var clauses = n.heritageClauses;
                            for (var _i = 0, clauses_1 = clauses; _i < clauses_1.length; _i++) {
                                var c = clauses_1[_i];
                                superTypes.push(c.types[0].expression.getText());
                            }
                        }
                        var vars_1 = [];
                        var funcDefs = [];
                        var constructor = null;
                        // let isAbstract = n.modifiers && n.modifiers.map(x => x.kind).includes(SyntaxKind.AbstractKeyword);
                        var instanceEp = new ExprProcessor();
                        var staticEp = new ExprProcessor();
                        var _loop_1 = function (v) {
                            var staticQ = isStatic(v);
                            var ep = staticQ ? staticEp : instanceEp;
                            if (ts.isPropertyDeclaration(v)) {
                                var v1 = v;
                                var init = v1.initializer ? ep.processExpr(v1.initializer) : null;
                                vars_1.push(new NamedValue(parsePropertyName(v1.name), [parseMark(v1.type, v1), init, staticQ, getSrcSpan(v1.name)]));
                            }
                            else if (ts.isMethodDeclaration(v) || ts.isAccessor(v)) {
                                funcDefs.push([getSingleton(rec(v).stmts), staticQ]);
                            }
                            else if (ts.isConstructorDeclaration(v)) {
                                var c_1 = getSingleton(rec(v).stmts);
                                c_1.args
                                    .filter(function (v) { return c_1.publicVars.includes(v.name); })
                                    .forEach(function (p) { return vars_1.push(new NamedValue(p.name, [p.value[0], null, false, p.value[1]])); });
                                constructor = c_1;
                            }
                            else if (ts.isIndexSignatureDeclaration(v)) {
                                var n_1 = v;
                                var srcSpan = n_1.type ? getSrcSpan(n_1.type) : null;
                                parseFunction("access", n_1, parseModifiers(n_1.modifiers), srcSpan);
                            }
                            else if (ts.isSemicolonClassElement(v)) {
                                // ignore
                            }
                            else {
                                throw new Error("Unknown statements in class definitions: " + typescript_1.SyntaxKind[v.kind]);
                            }
                        };
                        for (var _a = 0, _b = n.members; _a < _b.length; _a++) {
                            var v = _b[_a];
                            _loop_1(v);
                        }
                        var classModifiers = parseModifiers(n.modifiers);
                        var tVars = parseTVars(n);
                        var classStmt = new ClassDef(name, constructor, instanceEp.lambdaDefs, staticEp.lambdaDefs, vars_1, funcDefs, superTypes, classModifiers, tVars);
                        return EP.alongWith(classStmt);
                    }
                    case typescript_1.SyntaxKind.SwitchStatement: {
                        var n = node;
                        var switchCall = new FuncCall(SpecialVars.SWITCH, [EP.processExpr(n.expression)], "missing");
                        var clauses = flatMap(n.caseBlock.clauses, function (c) {
                            var body = flatMap(c.statements, function (s) { return rec(s).stmts; });
                            switch (c.kind) {
                                case typescript_1.SyntaxKind.CaseClause:
                                    var f = new FuncCall(SpecialVars.CASE, [EP.processExpr(c.expression)], "missing");
                                    var all = [new ExprStmt(f, false)].concat(body);
                                    return EP.alongWithMany(all).stmts;
                                case typescript_1.SyntaxKind.DefaultClause:
                                    return EP.alongWithMany(body).stmts;
                            }
                        });
                        return EP.alongWithMany([new ExprStmt(switchCall, false)].concat(clauses));
                    }
                    case typescript_1.SyntaxKind.ImportEqualsDeclaration: {
                        var n = node;
                        var rhs = n.moduleReference;
                        if (rhs.kind == typescript_1.SyntaxKind.ExternalModuleReference) {
                            var newName = n.name.text;
                            if (rhs.expression.kind == typescript_1.SyntaxKind.StringLiteral) {
                                var path = rhs.expression.text;
                                return EP.alongWith(new ImportSingle("$ExportEquals", newName, path));
                            }
                            else {
                                throw new Error("Unknown import equals: " + n.getText());
                            }
                        }
                        else {
                            return EP.alongWith(new NamespaceAliasStmt(n.name.getText(), rhs.getText()));
                        }
                    }
                    case typescript_1.SyntaxKind.ImportDeclaration: {
                        var n = node;
                        var path_1 = n.moduleSpecifier.text;
                        if (n.importClause) {
                            if (n.importClause.name) {
                                return EP.alongWith(new ImportDefault(n.importClause.name.text, path_1));
                            }
                            if (n.importClause.namedBindings) {
                                var bindings = n.importClause.namedBindings;
                                if (bindings.kind == typescript_1.SyntaxKind.NamespaceImport) {
                                    return EP.alongWith(new ImportModule(bindings.name.text, path_1));
                                }
                                else {
                                    var imports = bindings.elements.map(function (s) {
                                        var newName = s.name.text;
                                        if (s.propertyName) {
                                            return new ImportSingle(s.propertyName.text, newName, path_1);
                                        }
                                        else {
                                            return new ImportSingle(newName, newName, path_1);
                                        }
                                    });
                                    return EP.alongWithMany(imports);
                                }
                            }
                        }
                        return EP.alongWith();
                    }
                    case typescript_1.SyntaxKind.ExportAssignment: {
                        var n = node;
                        var e = EP.processExpr(n.expression);
                        if (n.isExportEquals == true) {
                            var alias = new NamespaceAliasStmt("$ExportEquals", n.expression.getText());
                            return EP.alongWith(alias);
                            // return EP.alongWith(new VarDef("$ExportEquals", null, e, true,
                            //   ["export"]));
                        }
                        else if (e.category == "Var") {
                            return EP.alongWith(new ExportDefault(e.name, null));
                        }
                        else {
                            return EP.alongWith(new VarDef("defaultVar", parseMark(undefined, n.expression), e, true, ["export", "default"], null));
                        }
                    }
                    case typescript_1.SyntaxKind.NamespaceExportDeclaration: {
                        var n = node;
                        //todo: check if this is the right way
                        var name = n.name.text;
                        return EP.alongWith(new ExportSingle(name, name, null));
                    }
                    case typescript_1.SyntaxKind.ExportDeclaration: {
                        var n = node;
                        var path_2 = n.moduleSpecifier ? n.moduleSpecifier.text : null;
                        if (n.exportClause) {
                            var clause = n.exportClause;
                            var exports_1 = clause.elements.map(function (s) {
                                var newName = s.name.text;
                                if (s.propertyName) {
                                    return new ExportSingle(s.propertyName.text, newName, path_2);
                                }
                                else {
                                    return new ExportSingle(newName, newName, path_2);
                                }
                            });
                            return EP.alongWithMany(exports_1);
                        }
                        else {
                            return EP.alongWith(new ExportModule(path_2));
                        }
                    }
                    case typescript_1.SyntaxKind.EnumDeclaration: {
                        var enumEquiv_1 = new TVar("number");
                        var n_2 = node;
                        var vars = n_2.members.map(function (member) {
                            var vName = member.name.getText();
                            return new NamedValue(vName, new Const("ENUM", enumEquiv_1, getLineNumber(n_2)));
                        });
                        var rhs = new ObjLiteral(vars, "missing");
                        var mds = parseModifiers(n_2.modifiers);
                        return EP.alongWithMany([
                            new VarDef(n_2.name.text, "missing", rhs, true, mds, getSrcSpan(n_2.name)),
                            new TypeAliasStmt(n_2.name.text, [], enumEquiv_1, mds, [])
                        ]);
                    }
                    case typescript_1.SyntaxKind.InterfaceDeclaration: {
                        var n = node;
                        var superTypes = [];
                        if (n.heritageClauses) {
                            var clauses = n.heritageClauses;
                            for (var _c = 0, clauses_2 = clauses; _c < clauses_2.length; _c++) {
                                var c = clauses_2[_c];
                                superTypes.push(c.types[0].expression.getText());
                            }
                        }
                        var tVars = parseTVars(n);
                        var members = n.members.map(parseTypeMember);
                        var objT = new ObjectType(members);
                        return EP.alongWith(new TypeAliasStmt(n.name.text, tVars, objT, parseModifiers(n.modifiers), superTypes));
                    }
                    case typescript_1.SyntaxKind.TypeAliasDeclaration: {
                        var n = node;
                        var tVars = parseTVars(n);
                        return EP.alongWith(new TypeAliasStmt(n.name.text, tVars, parseTypeNode(n.type), parseModifiers(n.modifiers), []));
                    }
                    case typescript_1.SyntaxKind.TryStatement: {
                        var n = node;
                        var tryPart = rec(n.tryBlock).stmts;
                        var finallyPart = n.finallyBlock ? rec(n.finallyBlock).stmts : [];
                        return EP.alongWithMany(tryPart.concat(finallyPart));
                    }
                    case typescript_1.SyntaxKind.ModuleDeclaration: {
                        var n = node;
                        var name = n.name.text;
                        var body = n.body;
                        if (body) {
                            switch (body.kind) {
                                case ts.SyntaxKind.ModuleBlock: {
                                    var stmts = flatMap(body.statements, function (x) { return rec(x).stmts; });
                                    var modifiers = parseModifiers(n.modifiers);
                                    var r = new NamespaceStmt(name, new BlockStmt(stmts), modifiers);
                                    return EP.alongWith(r);
                                }
                                case ts.SyntaxKind.ModuleDeclaration: {
                                    var modifiers = parseModifiers(n.modifiers);
                                    var r = new NamespaceStmt(name, new BlockStmt(rec(body).stmts), modifiers);
                                    return EP.alongWith(r);
                                }
                                default:
                                    throw new Error("Module declare body? Text: \n" + body.getText());
                            }
                        }
                        return EP.alongWith();
                    }
                    case typescript_1.SyntaxKind.LabeledStatement: {
                        var n = node;
                        return rec(n.statement);
                    }
                    // ignored statements:
                    case typescript_1.SyntaxKind.DebuggerStatement:
                    case typescript_1.SyntaxKind.BreakStatement:
                    case typescript_1.SyntaxKind.ContinueStatement:
                        return EP.alongWith(new CommentStmt(node.getText()));
                    case typescript_1.SyntaxKind.EmptyStatement:
                        return EP.alongWithMany([]);
                    default:
                        throw new Error("Unknown stmt category: " + ts.SyntaxKind[node.kind]);
                }
            });
        }
        function parsePropertyName(name) {
            switch (name.kind) {
                case ts.SyntaxKind.Identifier:
                    return name.text;
                case ts.SyntaxKind.ComputedPropertyName:
                    return SpecialVars.ComputedPropertyName;
                case ts.SyntaxKind.NumericLiteral:
                    return name.getText();
                case ts.SyntaxKind.StringLiteral:
                    return name.text;
            }
        }
        return rec(node).stmts;
    };
    return StmtParser;
}());
exports.StmtParser = StmtParser;
function parseModifiers(modifiersNode) {
    if (modifiersNode) {
        return flatMap(modifiersNode, function (m) {
            switch (m.kind) {
                case typescript_1.SyntaxKind.ExportKeyword:
                    return ["export"];
                case typescript_1.SyntaxKind.DefaultKeyword:
                    return ["default"];
                case typescript_1.SyntaxKind.ConstKeyword:
                    return ["const"];
                case typescript_1.SyntaxKind.StaticKeyword:
                    return ["static"];
                case typescript_1.SyntaxKind.PublicKeyword:
                    return ["public"];
                case typescript_1.SyntaxKind.AsyncKeyword:
                    return ["async"];
                default:
                    return [];
            }
        });
    }
    return [];
}
function flattenBlock(stmts) {
    if (stmts.length == 1) {
        return stmts[0];
    }
    else {
        return new BlockStmt(stmts);
    }
}
exports.flattenBlock = flattenBlock;
function getSingleton(xs) {
    if (xs.length != 1) {
        throw new Error("Expect a singleton collection, but get: " + xs);
    }
    return xs[0];
}
exports.getSingleton = getSingleton;
var SpecialVars = /** @class */ (function () {
    function SpecialVars() {
    }
    SpecialVars.spread = new Var("$Spread");
    SpecialVars.typeOf = new Var("$TypeOf");
    SpecialVars.THIS = new Var("this");
    SpecialVars.SUPER = new Var("super");
    SpecialVars.CASE = new Var("$Case");
    SpecialVars.SWITCH = new Var("$Switch");
    SpecialVars.DELETE = new Var("$Delete");
    SpecialVars.ArrayAccess = new Var("$ArrayAccess");
    SpecialVars.YIELD = new Var("$Yield");
    SpecialVars.AWAIT = new Var("$Await");
    SpecialVars.Template = new Var("$Template");
    SpecialVars.ComputedPropertyName = "$ComputedPropertyName";
    SpecialVars.UNKNOWN = "$UNKNOWN";
    return SpecialVars;
}());
// utilities
function flatMap(xs, f) {
    return xs.reduce(function (acc, x) { return acc.concat(f(x)); }, []);
}
exports.flatMap = flatMap;
function forNode(node, action) {
    try {
        return action();
    }
    catch (e) {
        console.debug("Error occurred when processing node: " + node.getText());
        throw e;
    }
}
exports.forNode = forNode;
function getLineNumber(node) {
    var src = node.getSourceFile();
    var line = src.getLineAndCharacterOfPosition(node.getStart()).line;
    return line + 1;
}
exports.getLineNumber = getLineNumber;
function getSrcSpan(node) {
    var src = node.getSourceFile();
    var start = src.getLineAndCharacterOfPosition(node.getStart());
    var end = src.getLineAndCharacterOfPosition(node.getEnd());
    return [[start.line, start.character], [end.line, end.character]];
}
exports.getSrcSpan = getSrcSpan;
function parseFiles(sources, libraryFiles) {
    var program = ts.createProgram(libraryFiles, {
        target: ts.ScriptTarget.ES2015,
        module: ts.ModuleKind.CommonJS
    });
    program.getSemanticDiagnostics(undefined, undefined); //call this to store type info into nodes
    var checker = program.getTypeChecker(); // must call this to link source files to nodes
    var warnnings = [];
    var sFiles = sources
        .map(function (file) { return mustExist(program.getSourceFile(file), "getSourceFile failed for: " + file); })
        .filter(function (sc) {
        var noError = program.getSyntacticDiagnostics(sc).length == 0;
        if (!noError) {
            warnnings.push("file " + sc.fileName + " has syntactic error, skipped.");
        }
        return noError;
    });
    mustExist(sFiles);
    var parser = new StmtParser(checker);
    return [sFiles.map(function (src, index) {
            var stmts = [];
            src.statements.forEach(function (s) {
                try {
                    var r = parser.parseStmt(s);
                    r.forEach(function (s) { return stmts.push(s); });
                }
                catch (e) {
                    console.error("Parsing failed for file: " + src.fileName);
                    throw e;
                }
            });
            return new GModule(sources[index], stmts);
        }), warnnings];
}
exports.parseFiles = parseFiles;
function handleError(node, thunk) {
    // return thunk();
    try {
        return thunk();
    }
    catch (e) {
        var line = getLineNumber(node);
        console.log("Failure occurred at line " + line + ": " + node.getText());
        console.log("Error message: " + e.message);
        throw e;
    }
}
function useOrElse(v, f, backup) {
    if (v) {
        return f(v);
    }
    else {
        return backup;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2luZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhcnNpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFpQztBQUNqQyx5Q0FBa0U7QUFHbEU7SUFDRSxpQkFBbUIsSUFBWSxFQUFTLEtBQWM7UUFBbkMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFVBQUssR0FBTCxLQUFLLENBQVM7SUFDdEQsQ0FBQztJQUNILGNBQUM7QUFBRCxDQUFDLEFBSEQsSUFHQztBQUhZLDBCQUFPO0FBS3BCLFNBQWdCLFNBQVMsQ0FBSSxDQUFLLEVBQUUsR0FBWTtJQUM5QyxJQUFJLENBQUMsQ0FBQyxFQUFFO1FBQ04sSUFBSSxHQUFHLEVBQUU7WUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixHQUFHLEdBQUcsQ0FBQyxDQUFDO1NBQ2pEO2FBQU07WUFDTCxNQUFNLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1NBQ2pDO0tBQ0Y7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUM7QUFURCw4QkFTQztBQU9EO0lBR0UsbUJBQW1CLEVBQVM7UUFBVCxPQUFFLEdBQUYsRUFBRSxDQUFPO1FBRlosYUFBUSxHQUFHLFdBQVcsQ0FBQztJQUd2QyxDQUFDO0lBQ0gsZ0JBQUM7QUFBRCxDQUFDLEFBTEQsSUFLQztBQUVEO0lBR0Usa0JBQW1CLEVBQVM7UUFBVCxPQUFFLEdBQUYsRUFBRSxDQUFPO1FBRlosYUFBUSxHQUFHLFVBQVUsQ0FBQztJQUd0QyxDQUFDO0lBQ0gsZUFBQztBQUFELENBQUMsQUFMRCxJQUtDO0FBS0Q7SUFHRSxjQUFtQixJQUFZO1FBQVosU0FBSSxHQUFKLElBQUksQ0FBUTtRQUZmLGFBQVEsR0FBRyxNQUFNLENBQUM7UUFHaEMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFDSCxXQUFDO0FBQUQsQ0FBQyxBQU5ELElBTUM7QUFFRDtJQUlFO1FBSGdCLGFB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