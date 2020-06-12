export enum ColumnType {
    INTEGER = "integer",
    INT = "int",
    SMALLINT = "smallint",
    TINYINT = "tinyint",
    MEDIUMINT = "mediumint",
    BIGINT = "bigint",
    DEMICAL = "demical",
    NUMERIC = "numeric",
    FLOAT = "float",
    DOUBLE = "double",
    BIT = "bit",
    DATE = "date",
    TIME = "time",
    DATETIME = "datetime",
    TIMESTAMP = "timestamp",
    YEAR = "year",
    CHAR = "char",
    VARCHAR = "varchar",
    BINARY = "binary",
    VARBINARY = "varbinary",
    TINYBLOB = "tinyblob",
    BLOB = "blob",
    MEDIUMBLOB = "mediumblob",
    LOBGBLOB = "lobgblob",
    TINYTEXT = "tinytext",
    MEDIUMTEXT = "mediumtext",
    TEXT = "text",
    LONGTEXT = "longtext"
}

export interface ColumnDescribe {
    name: string;
    type: ColumnType;
    default: string;
}