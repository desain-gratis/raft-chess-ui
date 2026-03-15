"use client";

export type Repository = {
    url?: string;
    namespace?: string;
    id?: string;
};

export type BoundAddress = {
    host?: string;
    port?: number;
};

export type Service = {
    namespace: string;
    id: string;
    name?: string;
    description?: string;
    repository?: Repository;
    executable_path?: string;
    bound_addresses?: BoundAddress[];
    published_at?: string;
    url?: string;
};

export type JobStatus = {
    status?: string;
    error_message?: string;
};

export type ServiceJob = {
    id: string
    status?: string
    published_at?: string

    request?: SubmitDeploymentJobRequest

    target?: Array<{
        host: string
        configure_host_job?: {
            status?: Record<string, { status: string }>
        }
        restart_service_job?: {
            status?: Record<string, { status: string }>
        }
    }>

    raft_config?: {
        shards: Record<number, RaftShardConfig>
    }

    configure_host_job?: {
        status?: Record<string, { status: string }>
    }

    restart_service_job?: {
        status?: Record<string, { status: string }>
    }
}

export type SubmitDeploymentJobRequest = {
    namespace: string
    service: ServiceDefinition
    id?: string

    build_version: number
    secret_version: number
    env_version: number

    routing_version?: number

    target_hosts?: Host[]

    raft_shard?: Record<number, RaftShardConfig>
    raft_port: number
    raft_port_mapping?: Record<string, number>
    raft_deployment_id: number

    timeout_seconds?: number

    is_believe: boolean
    url?: string
    published_at?: string
}

export type RaftShardConfig = {
    id: string
    shard_id: number
    type: string
    description: string
}

export type RaftServiceConfig = {
    replica_id: number
    deployment_id: number
    raft_address: string
}

export type RaftHostConfig = {
    replica_id: number
    base_wal_dir: string
    base_node_host_dir: string
    rtt_millisecond: number
}

export type Host = {
    host: string
    raft_config?: RaftHostConfig
}

export type ServiceDefinition = {
    id: string
}

export type KV = {
    namespace?: string;
    service?: string;
    id?: number | string;
    version?: string;
    value?: Record<string, any>;
    published_at?: string;
    url?: string;
};

export type Build = {
    namespace?: string;
    id?: string;
    name?: string;
    commit_id?: string;
    branch?: string;
    actor?: string;
    tag?: string;
    source?: string;
    data?: any;
    published_at?: string;
    repository_id?: string;
    url?: string;
    os_arch?: string[];
    archive?: Array<{ id?: string; url?: string }>;
};