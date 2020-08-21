import {Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, ManyToOne, OneToMany, OneToOne, BaseEntity, Unique} from "typeorm";
import { Length, NotContains } from "class-validator";
import { Service, ServiceStatus } from "./Service";

@Entity()
@Unique("application_namespace_unique", ["nameSpace"])
export class Application extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Length(1, 100)
  @NotContains("-")
  nameSpace: string;

  @Column()
  @Length(1, 100)
  title: string;

  @Column({type: "text"})
  description: string;

  @OneToMany(type => Service, service => service.application)
  services: Service[];

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  get isDeployable(): boolean {
    if(this.services.length == 0) return false;
    this.services.forEach(api => {
      if(api.status == ServiceStatus.METALOADED) return false
    });
    return true; 
  }
}
