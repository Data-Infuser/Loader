import {Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, OneToMany, OneToOne} from "typeorm";
import { Length } from "class-validator";
import { MetaColumn } from "./MetaColumn";
import { Service } from "./Service";


export enum AcceptableDbms {
  MYSQL = "mysql",
  ORACLE = "oracle",
  MARIADB = "mariadb",
  POSTGRES = "postgres"
}

@Entity()
export class Meta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Length(1, 100)
  title: string;

  @Column({default: 'file'})
  dataType: string;

  @Column({nullable: true})
  @Length(1, 100)
  originalFileName: string;

  @Column({nullable: true})
  @Length(4, 100)
  filePath: string;

  @Column({nullable: true})
  @Length(1, 20)
  extension: string;

  @Column({
    type: "enum",
    enum: AcceptableDbms,
    default: AcceptableDbms.MYSQL
  })
  dbms: AcceptableDbms;

  @Column({nullable: true})
  host: string;

  @Column({nullable: true})
  port: string;

  @Column({nullable: true})
  db: string;

  @Column({nullable: true})
  dbUser: string;

  @Column({nullable: true})
  pwd: string;

  @Column({nullable: true})
  table: string;

  @Column()
  rowCounts: number;

  @Column({ default: 0 })
  skip: number;

  @Column({ default: 0 })
  sheet: number;

  @Column({ nullable: false, default: false })
  isActive: boolean;

  @OneToOne(type => Service, service => service.meta) // specify inverse side as a second parameter
  service: Service;

  @OneToMany(type => MetaColumn, mc => mc.meta)
  columns: MetaColumn[];

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}
